// Table test of the viewer's file-name rule (fileName, exported from
// _extensions/embedpdf/embedpdf-viewer.js). The viewer is a browser module, so
// the test serves the extension folder, imports the viewer in Chrome, and calls
// fileName on each address below. "" means the address names no file, and the
// embed is then named "PDF".
//
// Usage:  node tests/name_rule_test.mjs           # must print "N passed, 0 failed"
//         node tests/name_rule_test.mjs --plant   # swaps one expected name; must fail
// Set CHROME_PATH to use another Chrome or Chromium binary.
// Exits 0 when every row passes, 1 when a row fails, 2 on a bad argument or
// when the server, the browser, or the viewer import fails.

import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { serveDocs } from "./serve_docs.mjs";

const ROWS = [
  ["sample.pdf", "sample.pdf"],
  ["files/sample%20copy.pdf", "sample copy.pdf"],
  ["files/100%25.pdf", "100%.pdf"],
  ["files/100%.pdf", "100%.pdf"],
  ["SAMPLE.PDF#page=2", "SAMPLE.PDF"],
  ["a.pdf#x?f=b.pdf", "a.pdf"],
  ["download.php?file=a.pdf", "a.pdf"],
  ["get?file=docs%2Fa.pdf&x=1", "a.pdf"],
  ["files/report", "report"],
  ["files/report?id=5", ""],
  ["https://example.com", ""],
  ["https://example.com/", ""],
  ["https://example.com:8080", ""],
  ["//example.com", ""],
  ["data:application/pdf;base64,JVBERi0x", ""],
  ["blob:https://example.com/1234", ""],
  // shapes beside the AC1 rows
  ["https://example.com/docs/a.pdf?download=1", "a.pdf"],
  ["https://example.com/get?file=a.pdf", "a.pdf"],
  ["files/report/", "report"],
  ["DATA:application/pdf;base64,JVBERi0x", ""],
  ["get?id=5&file=a+b.pdf", "a b.pdf"],
  ["https://example.com//a.pdf", "a.pdf"],
  ["//example.com//a.pdf", "a.pdf"],
  ["  files/sample.pdf ", "sample.pdf"],
  ["\tsample.pdf\n", "sample.pdf"],
  ["files/my%20report", "my report"],
  ["files/report?", ""],
  [" data:application/pdf;base64,JVBERi0x", ""],
];

const args = process.argv.slice(2);
if (args.some((a) => a !== "--plant")) {
  console.error("name_rule_test: the only flag is --plant");
  process.exit(2);
}
const rows = ROWS.map((r) => [...r]);
if (args.includes("--plant")) rows[6][1] = "download.php"; // the name the old rule gave

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; // macOS default
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_extensions", "embedpdf");

// a setup failure (server, browser, or viewer import) exits 2, not 1
const setupFailed = (err) => {
  console.error(`name_rule_test: setup failed: ${err.message}`);
  process.exit(2);
};
const server = await serveDocs({
  root: EXT,
  routes: { "/": (req, res) => res.writeHead(200, { "Content-Type": "text/html" }).end("<!doctype html><title>t</title>") },
}).catch(setupFailed);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] }).catch((err) => {
  server.close();
  setupFailed(err);
});
let got;
try {
  const page = await browser.newPage();
  await page.goto(base + "/");
  got = await page.evaluate(async (addresses) => {
    const { fileName } = await import("/embedpdf-viewer.js");
    return addresses.map((a) => fileName(a));
  }, rows.map((r) => r[0]));
} catch (err) {
  await browser.close();
  server.close();
  setupFailed(err);
}
await browser.close();
server.close();

let passed = 0;
let failed = 0;
rows.forEach(([address, want], i) => {
  if (got[i] === want) passed++;
  else {
    failed++;
    console.error(`FAIL ${JSON.stringify(address)}: got ${JSON.stringify(got[i])}, want ${JSON.stringify(want)}`);
  }
});
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
