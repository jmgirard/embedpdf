// Static server for docs/, shared by render_check.mjs and ios_check.mjs.
//
// Node's http module is used instead of `python3 -m http.server`: Python's
// server listens with a backlog of 5, and a browser opening many connections
// at once can get some of them reset, so the viewer JS sometimes never loads.
//
// serveDocs({ port, transformHtml, routes, root }) resolves to the listening
// server, or rejects on a listen error. It answers single byte ranges.
//   port           0 picks a free port (server.address().port)
//   root           directory to serve (default docs/)
//   transformHtml  optional (html) => html applied to every .html response
//   routes         optional { "/path": (req, res) => void } handlers
// serveRemote(mode) and pointPdfsAt(html, base, page) put the PDFs on another
// origin.

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

// Send `data` whole (200) or, for a single "bytes=a-b" or "bytes=a-" Range
// header, only those bytes (206); a range that starts past the end gets 416.
// Any other Range form is ignored and the whole file is sent, as RFC 9110
// allows. Content-Length and Accept-Ranges let PDF.js load a large PDF by
// ranges, as it does from a static web host.
function sendData(req, res, data, headers) {
  const size = data.length;
  const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
  if (m) {
    const start = Number(m[1]);
    const last = m[2] === "" ? Infinity : Number(m[2]);
    const end = Math.min(last, size - 1);
    // a range whose end is before its start is invalid, so it is ignored
    if (last >= start && start >= size) {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` }).end();
      return;
    }
    if (last >= start) {
      res.writeHead(206, {
        ...headers,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      res.end(data.subarray(start, end + 1));
      return;
    }
  }
  res.writeHead(200, { ...headers, "Accept-Ranges": "bytes", "Content-Length": size });
  res.end(data);
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

export function serveDocs({ port = 0, transformHtml = null, routes = {}, root = DOCS } = {}) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (routes[url.pathname]) return routes[url.pathname](req, res);
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
    sendData(req, res, data, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  });
  return listen(server, port);
}

// A second origin for remote-PDF checks: serves docs/ on its own port, which
// makes it another origin than the page's server.
//   mode blocked  no Access-Control-Allow-Origin header, so PDF.js cannot read it
//   mode cors     Access-Control-Allow-Origin: *
//   mode missing  HTTP 404 for every path, with Access-Control-Allow-Origin: *
//                 so that the 404 itself, not CORS, is what PDF.js meets
// A file is sent whole or by a single byte range, as serveDocs sends it. An
// OPTIONS request (a CORS preflight) gets 204; in modes cors and missing it
// allows GET and the Range header, and in mode blocked it allows nothing.
export const REMOTE_MODES = ["blocked", "cors", "missing"];
export function serveRemote(mode, { port = 0 } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    // Expose-Headers lets a cross-origin reader see the range headers
    const cors =
      mode === "blocked"
        ? {}
        : { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length" };
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
    sendData(req, res, fs.readFileSync(file), headers);
  });
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
// (e.g. "sub/p.html"): a URL resolves against the page's folder on `base`,
// and keeps its ?query or #fragment. Other links are left as they are.
export function pointPdfsAt(html, base, page = "") {
  const pageUrl = new URL(page.split("/").map(encodeURIComponent).join("/"), base);
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
