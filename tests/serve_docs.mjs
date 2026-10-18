// Static server for docs/, shared by render_check.mjs and ios_check.mjs.
//
// Node's http module is used instead of `python3 -m http.server`: Python's
// server listens with a backlog of 5, and a browser opening many connections
// at once can get some of them reset, so the viewer JS sometimes never loads.
//
// serveDocs({ port, transformHtml, routes }) resolves to the listening server.
//   port           0 picks a free port (server.address().port)
//   transformHtml  optional (html) => html applied to every .html response
//   routes         optional { "/path": (req, res) => void } handlers

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
};

export function serveDocs({ port = 0, transformHtml = null, routes = {} } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (routes[url.pathname]) return routes[url.pathname](req, res);
    let file;
    try {
      file = path.join(DOCS, decodeURIComponent(url.pathname));
    } catch {
      res.writeHead(400).end(); // malformed percent-escape
      return;
    }
    if (!file.startsWith(DOCS + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    const ext = path.extname(file);
    let data = fs.readFileSync(file);
    if (ext === ".html" && transformHtml) data = transformHtml(data.toString("utf8"));
    // no-store: the browser must load the viewer build under test, not a cached one
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
