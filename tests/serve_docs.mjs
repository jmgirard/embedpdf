// Static server for docs/ (or another root), shared by render_check.mjs,
// ios_check.mjs, safari_check.mjs, and name_rule_test.mjs, which serves
// _extensions/embedpdf. tests/helpers_test.mjs tests it.
//
// Node's http module is used instead of `python3 -m http.server`: Python's
// server listens with a backlog of 5, and a browser opening many connections
// at once can get some of them reset, so the viewer JS sometimes never loads.
//
// serveDocs({ port, transformHtml, routes, root, missingPdfs, slowWhole, noRanges })
// resolves to the listening server, or rejects on a listen error. It answers
// single byte ranges.
//   port           0 picks a free port (server.address().port)
//   root           directory to serve (default docs/)
//   transformHtml  optional (html) => html applied to every .html response
//   routes         optional { "/path": (req, res) => void } handlers
//   missingPdfs    true: answer 404 for every path that ends in .pdf, so each
//                  PDF the page names is missing from its own origin
//   slowWhole      true: send a whole-file answer for a .pdf file over
//                  SLOW_ABOVE bytes slowly (see sendData), so PDF.js loads it
//                  by ranges
//   noRanges       true: ignore every Range header and send the whole file
// The server's rangeCounts Map holds the number of 206 answers per request
// path, as sent (still percent-encoded, no ?query). Its requests array holds
// one { method, path, search, origin, range, status } entry for each request
// it answered with a file (200, 206, or 416), in order: path as sent, search
// the ?query or "", origin and range the Origin and Range headers or null.
// serveRemote(mode, { port, slowWhole, noRanges }) and pointPdfsAt(html, base,
// page) put the PDFs on another origin.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".yml": "text/yaml",
};

// PDF.js 6.1.200 asks for byte ranges only for a file over this many bytes
// (2 × its 65536-byte range chunk; validateRangeRequestCapabilities in
// pdfjs/pdf.min.mjs)
export const SLOW_ABOVE = 2 * 65536;
const SLOW_PIECE = 4096; // bytes per piece of a slow whole-file answer
const SLOW_EVERY = 200; // ms between pieces

// Send `data` whole (200) or, for a single "bytes=a-b" or "bytes=a-" Range
// header, only those bytes (206); a range that starts past the end gets 416.
// Any other Range form is ignored and the whole file is sent, as RFC 9110
// allows. Content-Length and Accept-Ranges let PDF.js load a large PDF by
// ranges, as it does from a static web host. Returns the status code.
//   slowWhole  a whole-file answer for a file over SLOW_ABOVE bytes is sent
//              SLOW_PIECE bytes every SLOW_EVERY ms. On a local server PDF.js
//              otherwise often gets the whole file before it asks for a
//              range, so this makes it load by ranges.
//   noRanges   every Range header is ignored, so each answer is the whole
//              file (200), still with Accept-Ranges
function sendData(req, res, data, headers, { slowWhole = false, noRanges = false } = {}) {
  const size = data.length;
  const m = noRanges ? null : /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
  if (m) {
    const start = Number(m[1]);
    const last = m[2] === "" ? Infinity : Number(m[2]);
    const end = Math.min(last, size - 1);
    // a range whose end is before its start is invalid, so it is ignored
    if (last >= start && start >= size) {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` }).end();
      return 416;
    }
    if (last >= start) {
      res.writeHead(206, {
        ...headers,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      res.end(data.subarray(start, end + 1));
      return 206;
    }
  }
  res.writeHead(200, { ...headers, "Accept-Ranges": "bytes", "Content-Length": size });
  // a HEAD answer has no body to send slowly
  if (!slowWhole || size <= SLOW_ABOVE || req.method === "HEAD") {
    res.end(data);
    return 200;
  }
  let at = 0;
  const timer = setInterval(() => {
    if (res.destroyed) return clearInterval(timer);
    res.write(data.subarray(at, at + SLOW_PIECE));
    at += SLOW_PIECE;
    if (at >= size) {
      clearInterval(timer);
      res.end();
    }
  }, SLOW_EVERY);
  // the browser drops the answer once it has the file by ranges
  res.on("close", () => clearInterval(timer));
  return 200;
}

// Count one 206 answer for a request path (as sent, still percent-encoded),
// and log the request in server.requests
function countRange(server, status, url, req) {
  if (status === 206) server.rangeCounts.set(url.pathname, (server.rangeCounts.get(url.pathname) || 0) + 1);
  server.requests.push({
    method: req.method,
    path: url.pathname,
    search: url.search,
    origin: req.headers.origin ?? null,
    range: req.headers.range ?? null,
    status,
  });
}

// resolves to the server once it listens; rejects on a listen error (such as
// EADDRINUSE for a port that another process holds)
function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

// A Content-Security-Policy whose script-src omits 'unsafe-eval', so a page
// served with it cannot run eval or new Function. It allows what a Quarto page
// and the viewer load: the site's own scripts, inline scripts, and blob:
// workers.
export const NO_EVAL_CSP = "script-src 'self' 'unsafe-inline' blob:";

// csp: a Content-Security-Policy header value sent with every answer for a
// file (200, 206, or 416), such as NO_EVAL_CSP; none when null
export function serveDocs({ port = 0, transformHtml = null, routes = {}, root = DOCS, missingPdfs = false, slowWhole = false, noRanges = false, csp = null } = {}) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (routes[url.pathname]) return routes[url.pathname](req, res);
    if (missingPdfs && /\.pdf$/i.test(url.pathname)) {
      res.writeHead(404).end();
      return;
    }
    let file;
    try {
      file = path.join(root, decodeURIComponent(url.pathname));
    } catch {
      res.writeHead(400).end(); // malformed percent-escape
      return;
    }
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    const ext = path.extname(file);
    let data = fs.readFileSync(file);
    if (ext === ".html" && transformHtml) data = Buffer.from(transformHtml(data.toString("utf8")), "utf8");
    // no-store: the browser must load the viewer build under test, not a cached one
    const headers = { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" };
    if (csp) headers["Content-Security-Policy"] = csp;
    // only a PDF is slow: Bootstrap's CSS and PDF.js itself are over SLOW_ABOVE too
    countRange(server, sendData(req, res, data, headers, { slowWhole: slowWhole && ext.toLowerCase() === ".pdf", noRanges }), url, req);
  });
  server.rangeCounts = new Map();
  server.requests = [];
  return listen(server, port);
}

// A second origin for remote-PDF checks: serves docs/ on its own port, which
// makes it another origin than the page's server.
//   mode blocked  no Access-Control-Allow-Origin header, so PDF.js cannot read it
//   mode cors     Access-Control-Allow-Origin: *
//   mode missing  HTTP 404 for every GET, with Access-Control-Allow-Origin: *
//                 so that the 404 itself, not CORS, is what PDF.js meets
// A file is sent whole or by a single byte range, as serveDocs sends it, but
// slowWhole slows only a request with an Origin header (a CORS read, such as
// PDF.js's): a native viewer's read of the same PDF has none. In
// modes cors and missing, Access-Control-Expose-Headers lets a cross-origin
// reader see Accept-Ranges and Content-Range. An OPTIONS request (a CORS
// preflight) gets 204 in every mode; in modes cors and missing it allows GET
// and the Range header, and in mode blocked it sends no Access-Control-
// header.
export const REMOTE_MODES = ["blocked", "cors", "missing"];
export function serveRemote(mode, { port = 0, slowWhole = false, noRanges = false } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    // Expose-Headers lets a cross-origin reader see the range headers
    // (Content-Length is exposed already)
    const cors =
      mode === "blocked" ? {} : { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range" };
    if (req.method === "OPTIONS") {
      const allow = mode === "blocked" ? {} : { "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "Range" };
      res.writeHead(204, { ...cors, ...allow }).end();
      return;
    }
    let file = null;
    try {
      file = path.join(DOCS, decodeURIComponent(url.pathname));
    } catch {}
    if (mode === "missing" || !file || !file.startsWith(DOCS + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, cors).end();
      return;
    }
    const headers = { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", ...cors };
    // only a CORS read (PDF.js's, with an Origin header) is slow: a native
    // viewer's read of the same PDF sends none and comes at full speed, so in
    // practice it ends before PDF.js reads the PDF
    const slow = slowWhole && path.extname(file).toLowerCase() === ".pdf" && req.headers.origin !== undefined;
    countRange(server, sendData(req, res, fs.readFileSync(file), headers, { slowWhole: slow, noRanges }), url, req);
  });
  server.rangeCounts = new Map();
  server.requests = [];
  return listen(server, port);
}

// The attributes the shortcode writes, always double-quoted (embedpdf.lua):
// the data-src of <div class="embedpdf">, and the href of the fallback and
// button links, which carry `download`. Quarto can add attributes before
// class (role="img" on a self-contained page). Other quoting forms are not
// matched.
const DIV_TAG = /<div\b[^>]*>/gi;
const A_TAG = /<a\b[^>]*>/gi;
const isEmbedDiv = (tag) => /\sclass="(?:[^"]*\s)?embedpdf(?:\s[^"]*)?"/i.test(tag);
// `download` as an attribute name, outside any quoted value
const hasDownload = (tag) => /\sdownload(?=[\s=>/])/i.test(tag.replace(/"[^"]*"/g, '""'));
// a relative URL (no scheme, not //host) whose path ends in .pdf
const isRelativePdf = (v) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(v) && /^[^?#]*\.pdf(?:[?#]|$)/i.test(v);

// Point each relative PDF URL of the shortcode's attributes at the remote
// origin `base` (e.g. "http://127.0.0.1:9000/"), so each embed, fallback link,
// and button link names the remote PDF. `page` is the page's path under docs/
// (e.g. "sub/p.html"), read as a URL path as the scripts read it: a URL
// resolves against the page's folder on `base`, and keeps its ?query or
// #fragment. Other links are left as they are.
export function pointPdfsAt(html, base, page = "") {
  const pageUrl = new URL(page, base);
  const point = (attr) => (tag) =>
    tag.replace(new RegExp(`(\\s${attr}=")([^"]*)"`, "i"), (m, pre, v) => (isRelativePdf(v) ? `${pre}${new URL(v, pageUrl).href}"` : m));
  return html
    .replace(DIV_TAG, (tag) => (isEmbedDiv(tag) ? point("data-src")(tag) : tag))
    .replace(A_TAG, (tag) => (hasDownload(tag) ? point("href")(tag) : tag));
}

// The embed data-src values that pointPdfsAt leaves off `base`, such as the
// data: URLs of a self-contained page, each cut to its first 40 characters.
// A --remote run on such a page would check nothing remote.
export function embedSrcsOffRemote(html, base, page = "") {
  const off = [];
  for (const tag of pointPdfsAt(html, base, page).match(DIV_TAG) || []) {
    const m = isEmbedDiv(tag) && /\sdata-src="([^"]*)"/i.exec(tag);
    if (m && !m[1].startsWith(base)) off.push(m[1].length > 40 ? m[1].slice(0, 40) + "…" : m[1]);
  }
  return off;
}

// The file under docs/ that a page path or URL path names (any ?query or
// #fragment removed), or null when it is not a file there. The --remote
// preflight reads this file.
export function docsFile(page) {
  try {
    // decoded as serveDocs decodes a request path
    const file = path.resolve(DOCS, decodeURIComponent(page.replace(/[?#].*$/, "")));
    if (!file.startsWith(DOCS + path.sep)) return null;
    return fs.statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}
