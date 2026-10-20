// Unit tests for the helpers the browser checks share: the ink rule
// (tests/ink.mjs), the expected embed names (tests/expect_names.mjs), the PNG
// reader and image comparison (tests/png_diff.mjs), and in tests/serve_docs.mjs the docs/ server, the remote
// server, pointPdfsAt, embedSrcsOffRemote, and docsFile. Also the property-list
// codec and message framing of tests/webinspector.mjs. No browser.
//
// Usage:  node tests/helpers_test.mjs      # must print "N passed, 0 failed"

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { inkInPixels } from "./ink.mjs";
import { expectedNames } from "./expect_names.mjs";
import { decodePng, diffShare } from "./png_diff.mjs";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile, REMOTE_MODES, DOCS, SLOW_ABOVE, NO_EVAL_CSP } from "./serve_docs.mjs";
import { encodePlist, decodePlist, messageReader, frameMessage } from "./webinspector.mjs";

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

// --- decodePng ----------------------------------------------------------------
// a PNG of `rows` (arrays of channel bytes), color type 2 (RGB) or 6 (RGBA),
// each row written with filter filters[y % filters.length]
function crc32(buf) {
  let c = ~0;
  for (const v of buf) {
    c ^= v;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, rows, { colorType = 6, filters = [0], bitDepth = 8, interlace = 0 } = {}) {
  const bpp = colorType === 6 ? 4 : 3;
  const parts = [];
  let prev = Buffer.alloc(width * bpp);
  rows.forEach((row, y) => {
    const cur = Buffer.from(row);
    const f = filters[y % filters.length];
    const out = Buffer.alloc(cur.length);
    for (let x = 0; x < cur.length; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = (cur[x] - pred) & 0xff;
    }
    parts.push(Buffer.from([f]), out);
    prev = cur;
  });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(rows.length, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(parts))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
// 5 x 6 pixels of varied colors, so every filter predicts something other than 0
const PNG_W = 5;
const pngPixel = (x, y) => [(x * 53 + y * 17) & 0xff, (x * 29 + y * 101) & 0xff, (x * 7 + y * 211) & 0xff, (x * 61 + y * 3 + 40) & 0xff];
const pngRows = (bpp) => Array.from({ length: 6 }, (_, y) => Array.from({ length: PNG_W }, (_, x) => pngPixel(x, y).slice(0, bpp)).flat());
const pngExpect = (bpp) => Buffer.from(Array.from({ length: 6 * PNG_W }, (_, i) => {
  const p = pngPixel(i % PNG_W, Math.floor(i / PNG_W));
  return bpp === 4 ? p : [...p.slice(0, 3), 255];
}).flat());
for (const f of [0, 1, 2, 3, 4]) {
  const got = decodePng(encodePng(PNG_W, pngRows(4), { filters: [f] }));
  check(`png: RGBA with filter ${f} decodes`, got.width === PNG_W && got.height === 6 && got.data.equals(pngExpect(4)));
}
{
  const got = decodePng(encodePng(PNG_W, pngRows(3), { colorType: 2, filters: [4, 3, 2, 1, 0] }));
  check("png: RGB with mixed filters decodes with alpha 255", got.data.equals(pngExpect(3)));
}
{
  // IDAT split in two chunks, as an encoder may write it
  const one = encodePng(PNG_W, pngRows(4), { filters: [2] });
  const idatStart = one.indexOf("IDAT", 0, "latin1") - 4;
  const len = one.readUInt32BE(idatStart);
  const data = one.subarray(idatStart + 8, idatStart + 8 + len);
  const half = Math.floor(len / 2);
  const split = Buffer.concat([one.subarray(0, idatStart), pngChunk("IDAT", data.subarray(0, half)), pngChunk("IDAT", data.subarray(half)), one.subarray(idatStart + 12 + len)]);
  check("png: IDAT split across chunks decodes", decodePng(split).data.equals(pngExpect(4)));
}
const pngThrows = (buf, re) => {
  try {
    decodePng(buf);
    return false;
  } catch (err) {
    return re.test(err.message);
  }
};
check("png: 16-bit is refused", pngThrows(encodePng(PNG_W, pngRows(4), { bitDepth: 16 }), /bit depth 16/));
check("png: interlaced is refused", pngThrows(encodePng(PNG_W, pngRows(4), { interlace: 1 }), /interlace 1/));
check("png: palette (color type 3) is refused", pngThrows(encodePng(PNG_W, pngRows(3), { colorType: 3 }), /color type 3/));
check("png: a non-PNG is refused", pngThrows(Buffer.from("GIF89a and more bytes"), /not a PNG/));
{
  // the IDAT of a 6-row image under an IHDR that says 7 rows
  const short = encodePng(PNG_W, pngRows(4));
  const ihdrAt = short.indexOf("IHDR", 0, "latin1");
  const body = Buffer.from(short.subarray(ihdrAt + 4, ihdrAt + 17));
  body.writeUInt32BE(7, 4);
  const fixed = Buffer.concat([short.subarray(0, ihdrAt - 4), pngChunk("IHDR", body), short.subarray(ihdrAt + 21)]);
  check("png: image data shorter than the size is refused", pngThrows(fixed, /needed/));
  check("png: the same data with its true size decodes", decodePng(short).height === 6);
}

// --- diffShare ----------------------------------------------------------------
// a w x h white image with black squares [x, y, side]
function img(w, h, squares = []) {
  const data = Buffer.alloc(w * h * 4, 255);
  for (const [sx, sy, side, value = 0] of squares) {
    for (let y = sy; y < sy + side; y++) for (let x = sx; x < sx + side; x++) data.fill(value, (y * w + x) * 4, (y * w + x) * 4 + 3);
  }
  return { width: w, height: h, data };
}
{
  const base = img(40, 40, [[12, 12, 8]]);
  const d0 = diffShare(base, img(40, 40, [[12, 12, 8]]));
  check("diff: identical images differ in no block, at shift 0,0", d0.share === 0 && d0.dx === 0 && d0.dy === 0, JSON.stringify(d0));
  const d1 = diffShare(base, img(40, 40, [[13, 11, 8]]));
  check("diff: a 1-pixel move is absorbed at its shift", d1.share === 0 && d1.dx === 1 && d1.dy === -1, JSON.stringify(d1));
  const d2 = diffShare(base, img(40, 40, [[14, 10, 8]]));
  check("diff: a 2-pixel move is absorbed (shift 2)", d2.share === 0 && d2.dx === 2 && d2.dy === -2, JSON.stringify(d2));
  const d3 = diffShare(base, img(40, 40, [[15, 12, 8]]));
  check("diff: a 3-pixel move is not absorbed", d3.share > 0, JSON.stringify(d3));
  const dm = diffShare(base, img(40, 40, [[24, 24, 8]]));
  check("diff: a square elsewhere differs", dm.share > 0.05, JSON.stringify(dm));
  check("diff: images of other sizes give null", diffShare(base, img(40, 41)) === null);
  check("diff: an image with no whole block inside the shift edge gives null", diffShare(img(5, 5), img(5, 5)) === null);
  check("diff: the smallest image with one whole block compares", diffShare(img(8, 8), img(8, 8)).share === 0);
  check("diff: shift 0 does not absorb a 1-pixel move", diffShare(base, img(40, 40, [[13, 12, 8]]), { shift: 0 }).share > 0);
}
{
  // one pixel changed by 255 averages to 16 over a 4 x 4 block: below 40
  const dp = diffShare(img(40, 40), img(40, 40, [[22, 22, 1]]), { shift: 0 });
  check("diff: one dark pixel in a block is averaged away", dp.share === 0, JSON.stringify(dp));
  // a whole block 60 darker averages to 60: above 40
  const db = diffShare(img(40, 40), img(40, 40, [[20, 20, 4, 195]]), { shift: 0 });
  check("diff: a whole block 60 darker differs", db.share > 0, JSON.stringify(db));
  // the same pixel with block 1 is a difference
  const d1 = diffShare(img(40, 40), img(40, 40, [[22, 22, 1]]), { shift: 0, block: 1 });
  check("diff: block 1 compares single pixels", d1.share > 0, JSON.stringify(d1));
}

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

// --- webinspector: property lists and framing ----------------------------------
// Written by `plutil -convert binary1` (macOS 27.0) from an XML plist of
// {__selector: "_rpc_applicationSentListing:", count: 70000, yes: true,
// no: false, data: <7b 7d>, list: ["a", 3], name: "Zoom – in"}, the dash
// being U+2013, so its string is UTF-16.
const PLUTIL = Buffer.from(
  "YnBsaXN0MDDXAQIDBAUGBwgJCgsMDQ5aX19zZWxlY3RvclRkYXRhVWNvdW50Um5vU3llc1RuYW1lVGxpc3RfEBxfcnBjX2FwcGxpY2F0aW9uU2VudExpc3Rpbmc6Qnt9EgABEXAICWkAWgBvAG8AbQAgIBMAIABpAG6iDxBRYRADCBciJy0wNDk+XWBlZmd6fX8AAAAAAAABAQAAAAAAAAARAAAAAAAAAAAAAAAAAAAAgQ==",
  "base64"
);
const fromPlutil = decodePlist(PLUTIL);
check(
  "plist: decodes plutil's binary file",
  same({ ...fromPlutil, data: [...fromPlutil.data] }, { __selector: "_rpc_applicationSentListing:", data: [0x7b, 0x7d], count: 70000, no: false, yes: true, name: "Zoom – in", list: ["a", 3] }),
  JSON.stringify(fromPlutil)
);
check("plist: plutil's data is a Buffer", Buffer.isBuffer(fromPlutil.data));
const message = {
  __selector: "_rpc_forwardSocketData:",
  __argument: {
    WIRSocketDataKey: Buffer.from('{"id":1}'),
    small: 7,
    big: 70000,
    negative: -5,
    zero: 0,
    yes: true,
    no: false,
    ascii: "a string over fifteen characters",
    wide: "Zoom – in, a string over fifteen characters",
    empty: "",
    list: [1, "x", false, []],
    nested: { a: { b: "c" } },
  },
};
const back = decodePlist(encodePlist(message));
check(
  "plist: a message survives encode and decode",
  same({ ...back, __argument: { ...back.__argument, WIRSocketDataKey: back.__argument.WIRSocketDataKey.toString() } }, { ...message, __argument: { ...message.__argument, WIRSocketDataKey: '{"id":1}' } }),
  JSON.stringify(back)
);
check("plist: data comes back as a Buffer", Buffer.isBuffer(back.__argument.WIRSocketDataKey));
check("plist: output starts with bplist00", encodePlist({}).toString("latin1", 0, 8) === "bplist00");
let threw = "";
try {
  decodePlist(Buffer.from("<?xml version='1.0'?><plist></plist>                    "));
} catch (err) {
  threw = err.message;
}
check("plist: an XML plist is refused by name", threw.includes("not a bplist00"), threw);
threw = "";
try {
  encodePlist({ a: undefined });
} catch (err) {
  threw = err.message;
}
check("plist: undefined is refused by name", threw.includes("cannot encode undefined"), threw);
threw = "";
try {
  encodePlist({ a: 1.5 });
} catch (err) {
  threw = err.message;
}
check("plist: a fraction is refused by name", threw.includes("cannot encode number 1.5"), threw);
// framing: a 4-byte big-endian length, then the plist; a reader joins split
// chunks and splits joined ones
const f1 = frameMessage("_rpc_reportIdentifier:", { WIRConnectionIdentifierKey: "A" });
const f2 = frameMessage("_rpc_forwardGetListing:", { WIRApplicationIdentifierKey: "PID:1" });
check("frame: length prefix is the plist's length", f1.readUInt32BE(0) === f1.length - 4, String(f1.readUInt32BE(0)));
const reader = messageReader();
const both = Buffer.concat([f1, f2]);
const got = [...reader.push(both.subarray(0, 3)), ...reader.push(both.subarray(3, f1.length + 5)), ...reader.push(both.subarray(f1.length + 5))].map(decodePlist);
check(
  "frame: a reader splits two messages sent in odd chunks",
  same(got, [
    { __selector: "_rpc_reportIdentifier:", __argument: { WIRConnectionIdentifierKey: "A" } },
    { __selector: "_rpc_forwardGetListing:", __argument: { WIRApplicationIdentifierKey: "PID:1" } },
  ]),
  JSON.stringify(got)
);
check("frame: a partial message gives nothing yet", messageReader().push(f1.subarray(0, f1.length - 1)).length === 0);

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
check("off: self-contained page has 4 inlined embeds", offSelf.length === 4, JSON.stringify(offSelf));
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

  check("server: large.pdf is over SLOW_ABOVE", LARGE.length > SLOW_ABOVE, `${LARGE.length} bytes`);

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
// part of the file by then (about 3 pieces of 4096 bytes; the check allows
// less than half the file, so a late timer does not fail it).
async function bytesIn500ms(url, headers = {}) {
  const r = await fetch(url, { headers });
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
// a file under docs/ over SLOW_ABOVE bytes that is not a PDF (PDF.js itself)
const BIG_LIB = path.join("large_test_files", "libs", "quarto-contrib", fs.readdirSync(path.join(DOCS, "large_test_files", "libs", "quarto-contrib")).find((d) => d.startsWith("embedpdf-pdfjs-")), "pdf.min.mjs");
check("slow: pdf.min.mjs is over SLOW_ABOVE", fs.statSync(path.join(DOCS, BIG_LIB)).size > SLOW_ABOVE, BIG_LIB);
for (const kind of ["docs", "remote cors"]) {
  const start = (opts) => (kind === "docs" ? serveDocs(opts) : serveRemote("cors", opts));
  const slow = await start({ slowWhole: true });
  const at = `http://127.0.0.1:${slow.address().port}/`;
  try {
    // the remote server slows only a read with an Origin header (a CORS read)
    const corsRead = { Origin: "http://127.0.0.1:1" };
    const part = await bytesIn500ms(at + "files/large.pdf", corsRead);
    check(`${kind} slowWhole: large.pdf is sent in pieces`, part.status === 200 && part.length === String(LARGE.length) && part.got > 0 && part.got < LARGE.length / 2, `${part.status}, ${part.got} of ${part.length} bytes in 500 ms`);
    const bare = await bytesIn500ms(at + "files/large.pdf");
    if (kind === "docs") check("docs slowWhole: large.pdf is sent in pieces with no Origin header too", bare.status === 200 && bare.got > 0 && bare.got < LARGE.length / 2, `${bare.got} of ${bare.length} bytes in 500 ms`);
    else check(`${kind} slowWhole: large.pdf comes whole within 500 ms with no Origin header (a native viewer's read)`, bare.status === 200 && bare.got === LARGE.length, `${bare.got} of ${bare.length} bytes in 500 ms`);
    const t0 = Date.now();
    const small = await fetch(at + "sample.pdf");
    const smallBody = Buffer.from(await small.arrayBuffer());
    check(`${kind} slowWhole: sample.pdf (not over SLOW_ABOVE) comes whole at once`, smallBody.equals(SAMPLE) && Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    const t1 = Date.now();
    const lib = await fetch(at + BIG_LIB.split(path.sep).map(encodeURIComponent).join("/"));
    const libBody = Buffer.from(await lib.arrayBuffer());
    check(`${kind} slowWhole: a file over SLOW_ABOVE that is not a PDF comes whole at once`, libBody.equals(fs.readFileSync(path.join(DOCS, BIG_LIB))) && Date.now() - t1 < 1000, `${BIG_LIB}: ${Date.now() - t1} ms`);
    const a = await getRange(at + "files/large.pdf", "bytes=0-99");
    const b = await getRange(at + "files/large.pdf", `bytes=${LARGE.length - 100}-`);
    const c = await getRange(at + "files/sample%20copy.pdf", "bytes=0-9");
    const t3 = Date.now();
    const head = await fetch(at + "files/large.pdf", { method: "HEAD" });
    await head.arrayBuffer();
    const headMs = Date.now() - t3;
    check(`${kind} slowWhole: a HEAD request is answered at once`, head.status === 200 && head.headers.get("content-length") === String(LARGE.length) && headMs < 1000, `${head.status} ${head.headers.get("content-length")} in ${headMs} ms`);
    check(`${kind} slowWhole: ranges of large.pdf are 206 at once`, a.status === 206 && a.body.equals(LARGE.subarray(0, 100)) && b.status === 206 && b.body.equals(LARGE.subarray(-100)), `${a.status} ${b.status}`);
    check(`${kind}: rangeCounts counts 206 answers per path, %20 as sent`, same([...slow.rangeCounts], [["/files/large.pdf", 2], ["/files/sample%20copy.pdf", 1]]), JSON.stringify([...slow.rangeCounts]));
  } finally {
    slow.close();
  }
  // without the new options: large.pdf comes whole at once, with the headers
  // a whole-file answer always had
  const plain = await start();
  try {
    const t2 = Date.now();
    const r = await fetch(`http://127.0.0.1:${plain.address().port}/files/large.pdf`);
    const body = Buffer.from(await r.arrayBuffer());
    const ms = Date.now() - t2;
    const h = (k) => r.headers.get(k);
    check(`${kind} default: large.pdf comes whole within 1 s`, r.status === 200 && body.equals(LARGE) && ms < 1000, `${r.status} in ${ms} ms`);
    check(`${kind} default: whole-file headers`, h("content-type") === "application/pdf" && h("content-length") === String(LARGE.length) && h("accept-ranges") === "bytes" && h("cache-control") === "no-store", JSON.stringify([...r.headers]));
    if (kind !== "docs") check(`${kind} default: Access-Control- headers`, h("access-control-allow-origin") === "*" && h("access-control-expose-headers") === "Accept-Ranges, Content-Range", JSON.stringify([...r.headers]));
  } finally {
    plain.close();
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

// --- docs/ server with csp ------------------------------------------------------
check("csp: NO_EVAL_CSP has a script-src without 'unsafe-eval'", /(^|;)\s*script-src\s/.test(NO_EVAL_CSP) && !NO_EVAL_CSP.includes("'unsafe-eval'"), NO_EVAL_CSP);
{
  const plain = await serveDocs();
  const withCsp = await serveDocs({ csp: NO_EVAL_CSP });
  const header = async (srv, p, init) => {
    const r = await fetch(`http://127.0.0.1:${srv.address().port}/${p}`, init);
    await r.arrayBuffer();
    return [r.status, r.headers.get("content-security-policy")];
  };
  try {
    for (const [p, init, status] of [
      ["example.html", undefined, 200],
      ["sample.pdf", undefined, 200],
      ["sample.pdf", { headers: { Range: "bytes=0-99" } }, 206],
      ["sample.pdf", { headers: { Range: "bytes=99999999-" } }, 416],
    ]) {
      const what = `/${p}${init ? " " + init.headers.Range : ""}`;
      const [s1, h1] = await header(withCsp, p, init);
      check(`csp: ${what} is ${status} with the header`, s1 === status && h1 === NO_EVAL_CSP, `${s1} ${h1}`);
      const [s2, h2] = await header(plain, p, init);
      check(`csp: ${what} is ${status} with no header when csp is not set`, s2 === status && h2 === null, `${s2} ${h2}`);
    }
  } finally {
    plain.close();
    withCsp.close();
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
      // the request log: one entry per file answer, in order; no entry for
      // OPTIONS or a 404
      if (mode === "missing") {
        check("remote missing: requests logs no 404 or OPTIONS answer", remote.requests.length === 0, JSON.stringify(remote.requests));
      } else {
        const q = await fetch(at + "?x=1", { headers: { Origin: "http://127.0.0.1:1", Range: "bytes=0-9" } });
        await q.arrayBuffer();
        const log = remote.requests;
        check(`remote ${mode}: requests logs the five file answers and not OPTIONS`, same(log.map((r) => r.status), [206, 206, 416, 200, 206]), JSON.stringify(log.map((r) => r.status)));
        check(`remote ${mode}: a request with no Origin header logs origin null`, log[0] && log[0].origin === null && log[0].range === "bytes=0-99" && log[0].search === "", JSON.stringify(log[0]));
        check(`remote ${mode}: a request logs its Origin, Range, path, and query`, same(log[4], { method: "GET", path: "/sample.pdf", search: "?x=1", origin: "http://127.0.0.1:1", range: "bytes=0-9", status: 206 }), JSON.stringify(log[4]));
      }
    } finally {
      remote.close();
    }
  }
}

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
