// Unit tests for the helpers the browser checks share: the ink rule
// (tests/ink.mjs) and the docs/ server (tests/serve_docs.mjs). No browser.
//
// Usage:  node tests/helpers_test.mjs      # must print "N passed, 0 failed"

import { inkInPixels } from "./ink.mjs";

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

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
