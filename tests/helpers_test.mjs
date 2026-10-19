// Unit tests for the helpers the browser checks share: the ink rule
// (tests/ink.mjs) and the docs/ server (tests/serve_docs.mjs). No browser.
//
// Usage:  node tests/helpers_test.mjs      # must print "N passed, 0 failed"

import fs from "node:fs";
import path from "node:path";
import { inkInPixels } from "./ink.mjs";
import { serveDocs, DOCS } from "./serve_docs.mjs";

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
check("ink: one pure red pixel is ink", inkInPixels(pixels(1000, WHITE, 517, [255, 0, 0, 255])) === true);
// 999 is not a multiple of 100, so a check of every 100th pixel misses it
check("ink: one black last pixel is ink", inkInPixels(pixels(1000, WHITE, 999, [0, 0, 0, 255])) === true);
check("ink: a black but transparent pixel is no ink", inkInPixels(pixels(1000, WHITE, 517, [0, 0, 0, 0])) === false);
check("ink: no pixels is no ink", inkInPixels(new Uint8ClampedArray(0)) === false);
// the rule must run as injected source in a page, so it uses no outer names
check("ink: rule runs from its source text", new Function("return " + inkInPixels.toString())()(pixels(10, WHITE, 3, [0, 0, 255, 255])) === true);

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

  const r3 = await fetch(base + "sample.pdf", { headers: { Range: `bytes=${size}-${size + 10}` } });
  await r3.arrayBuffer();
  check("server: range past the end is 416", r3.status === 416, String(r3.status));
  check("server: 416 Content-Range", r3.headers.get("content-range") === `bytes */${size}`, r3.headers.get("content-range"));

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

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
