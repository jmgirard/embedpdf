// A Web Inspector client for Safari in an iOS simulator, used by
// safari_check.mjs --target simulator. It needs only Node's own modules.
//
// Each booted simulator runs webinspectord, which listens on a Unix socket
// whose path the simulator's RWI_LISTEN_SOCKET variable holds
// (simulatorSocket). Each message on it, both ways, is a 4-byte big-endian
// length and a binary property list {__selector, __argument}. The client
// sends _rpc_reportIdentifier:, asks Safari (com.apple.mobilesafari) for its
// pages with _rpc_forwardGetListing:, attaches to one page with
// _rpc_forwardSocketSetup:, and then sends Web Inspector protocol JSON with
// _rpc_forwardSocketData:, wrapped in Target.sendMessageToTarget for the
// page target that Target.targetCreated names. Answers come back in
// _rpc_applicationSentData:.
//
// openSafariPage({ socket, url }) resolves to a page whose methods mirror the
// WebDriver calls safari_check makes:
//   run(script, ...args)  runs `script` as a function body (it may use
//                         `arguments` and `return`) and resolves to its value
//   find(css)             node ids of the elements that match, in page order
//   label(id)             the name Safari gives the element: the `label` of
//                         DOM.getAccessibilityPropertiesForNode
//   attribute(id, name)   the attribute's value, or null when it is missing
//   close()
// Each call rejects after 10 s with no answer.

import net from "node:net";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

// --- binary property lists (bplist00) ---------------------------------------
// Values: true, false, integers, strings, Buffers (data), arrays, and plain
// objects (dictionaries with string keys). Other values throw.

export function encodePlist(root) {
  const parts = [];
  function header(type, n) {
    if (n < 15) return Buffer.from([type | n]);
    const b = Buffer.alloc(6);
    b[0] = type | 0xf;
    b[1] = 0x12; // a 4-byte integer holds the count
    b.writeUInt32BE(n, 2);
    return b;
  }
  function add(v) {
    const index = parts.length;
    parts.push(null);
    let b;
    if (v === true || v === false) b = Buffer.from([v ? 0x09 : 0x08]);
    else if (Number.isInteger(v)) {
      b = Buffer.alloc(9);
      b[0] = 0x13; // 8-byte integer
      b.writeBigInt64BE(BigInt(v), 1);
    } else if (typeof v === "string") {
      if (/^[\x00-\x7f]*$/.test(v)) b = Buffer.concat([header(0x50, v.length), Buffer.from(v, "latin1")]);
      else {
        const units = Buffer.from(v, "utf16le").swap16();
        b = Buffer.concat([header(0x60, units.length / 2), units]);
      }
    } else if (Buffer.isBuffer(v)) b = Buffer.concat([header(0x40, v.length), v]);
    else if (Array.isArray(v)) {
      const refs = v.map(add);
      b = Buffer.concat([header(0xa0, refs.length), refBytes(refs)]);
    } else if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      const keys = Object.keys(v);
      const keyRefs = keys.map(add);
      const valueRefs = keys.map((k) => add(v[k]));
      b = Buffer.concat([header(0xd0, keys.length), refBytes([...keyRefs, ...valueRefs])]);
    } else throw new Error(`encodePlist: cannot encode ${typeof v} ${String(v)}`);
    parts[index] = b;
    return index;
  }
  function refBytes(refs) {
    const b = Buffer.alloc(refs.length * 2);
    refs.forEach((r, i) => b.writeUInt16BE(r, i * 2));
    return b;
  }
  add(root);
  if (parts.length > 0xffff) throw new Error("encodePlist: more than 65535 objects");
  const magic = Buffer.from("bplist00");
  let at = magic.length;
  const offsets = Buffer.alloc(parts.length * 4);
  parts.forEach((p, i) => {
    offsets.writeUInt32BE(at, i * 4);
    at += p.length;
  });
  const trailer = Buffer.alloc(32);
  trailer[6] = 4; // offset size
  trailer[7] = 2; // object reference size
  trailer.writeBigUInt64BE(BigInt(parts.length), 8);
  trailer.writeBigUInt64BE(0n, 16); // the root is object 0
  trailer.writeBigUInt64BE(BigInt(at), 24);
  return Buffer.concat([magic, ...parts, offsets, trailer]);
}

export function decodePlist(buf) {
  if (buf.length < 40 || buf.toString("latin1", 0, 8) !== "bplist00") throw new Error("decodePlist: not a bplist00 property list");
  const t = buf.subarray(buf.length - 32);
  const offsetSize = t[6];
  const refSize = t[7];
  const count = Number(t.readBigUInt64BE(8));
  const root = Number(t.readBigUInt64BE(16));
  const table = Number(t.readBigUInt64BE(24));
  const uint = (at, n) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = v * 256 + buf[at + i];
    return v;
  };
  const offsets = [];
  for (let i = 0; i < count; i++) offsets.push(uint(table + i * offsetSize, offsetSize));
  function object(i) {
    const at = offsets[i];
    const marker = buf[at];
    const type = marker >> 4;
    const low = marker & 0xf;
    // a count of 15 or more follows the marker as an integer object
    const sized = () => {
      if (low !== 0xf) return [low, at + 1];
      const n = 1 << (buf[at + 1] & 0xf);
      return [uint(at + 2, n), at + 2 + n];
    };
    switch (type) {
      case 0x0:
        if (low === 0x8) return false;
        if (low === 0x9) return true;
        return null;
      case 0x1: {
        const n = 1 << low;
        return n === 8 ? Number(buf.readBigInt64BE(at + 1)) : uint(at + 1, n);
      }
      case 0x2:
        return low === 3 ? buf.readDoubleBE(at + 1) : buf.readFloatBE(at + 1);
      case 0x4: {
        const [n, s] = sized();
        return Buffer.from(buf.subarray(s, s + n));
      }
      case 0x5: {
        const [n, s] = sized();
        return buf.toString("latin1", s, s + n);
      }
      case 0x6: {
        const [n, s] = sized();
        return Buffer.from(buf.subarray(s, s + 2 * n)).swap16().toString("utf16le");
      }
      case 0xa: {
        const [n, s] = sized();
        return Array.from({ length: n }, (_, k) => object(uint(s + k * refSize, refSize)));
      }
      case 0xd: {
        const [n, s] = sized();
        const d = {};
        for (let k = 0; k < n; k++) d[object(uint(s + k * refSize, refSize))] = object(uint(s + (n + k) * refSize, refSize));
        return d;
      }
      default:
        throw new Error(`decodePlist: object type 0x${marker.toString(16)} is not read`);
    }
  }
  return object(root);
}

// Splits a stream of length-prefixed messages. push(chunk) returns the
// complete message bodies the chunks so far hold.
export function messageReader() {
  let pending = Buffer.alloc(0);
  return {
    push(chunk) {
      pending = Buffer.concat([pending, chunk]);
      const out = [];
      while (pending.length >= 4 && pending.length >= 4 + pending.readUInt32BE(0)) {
        const n = pending.readUInt32BE(0);
        out.push(pending.subarray(4, 4 + n));
        pending = pending.subarray(4 + n);
      }
      return out;
    },
  };
}

export function frameMessage(selector, argument) {
  const body = encodePlist({ __selector: selector, __argument: argument });
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  return Buffer.concat([length, body]);
}

// --- the simulator's socket -------------------------------------------------

// The webinspectord socket of a booted simulator. Throws when simctl gives
// none (the simulator is not booted).
export function simulatorSocket(udid) {
  let path;
  try {
    path = execFileSync("xcrun", ["simctl", "getenv", udid, "RWI_LISTEN_SOCKET"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    throw new Error(`simctl gives no Web Inspector socket for ${udid}: ${String(err.stderr || err.message).trim()}`);
  }
  if (!path) throw new Error(`simctl gives no Web Inspector socket for ${udid}`);
  return path;
}

// --- a Safari page ------------------------------------------------------------

const CALL_MS = 10000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Attaches to the Safari page whose address is `url`, waiting up to
// `waitMs` for Safari to list it.
export async function openSafariPage({ socket, url, waitMs = 30000 }) {
  const connection = randomUUID().toUpperCase();
  const sender = randomUUID().toUpperCase();
  const c = net.createConnection(socket);
  const reader = messageReader();
  const listeners = new Set();
  let closed = null;
  c.on("data", (chunk) => {
    for (const body of reader.push(chunk)) {
      const m = decodePlist(body);
      for (const l of [...listeners]) l(m);
    }
  });
  c.on("error", (err) => (closed = closed || err));
  c.on("close", () => (closed = closed || new Error("the Web Inspector socket closed")));
  await new Promise((resolve, reject) => {
    c.once("connect", resolve);
    c.once("error", reject);
  });
  const send = (selector, argument) => c.write(frameMessage(selector, { WIRConnectionIdentifierKey: connection, ...argument }));
  // resolves to pick(m) for the first message m for which it is not undefined
  const next = (what, pick, ms = CALL_MS) =>
    new Promise((resolve, reject) => {
      const l = (m) => {
        const v = pick(m);
        if (v === undefined) return;
        listeners.delete(l);
        clearTimeout(timer);
        resolve(v);
      };
      const timer = setTimeout(() => {
        listeners.delete(l);
        reject(closed || new Error(`no ${what} from Web Inspector after ${ms / 1000} s`));
      }, ms);
      listeners.add(l);
    });

  try {
    const apps = next("application list", (m) => (m.__selector === "_rpc_reportConnectedApplicationList:" ? m.__argument.WIRApplicationDictionaryKey : undefined));
    send("_rpc_reportIdentifier:", {});
    let safari = Object.values(await apps).find((a) => a.WIRApplicationBundleIdentifierKey === "com.apple.mobilesafari");
    // Safari joins the list when it starts
    const start = Date.now();
    while (!safari) {
      if (Date.now() - start > waitMs) throw new Error("Safari is not running in the simulator");
      safari = await next("Safari", (m) =>
        m.__selector === "_rpc_applicationConnected:" && m.__argument.WIRApplicationBundleIdentifierKey === "com.apple.mobilesafari" ? m.__argument : undefined
      ).catch(() => undefined);
    }
    const app = safari.WIRApplicationIdentifierKey;
    let page;
    while (!page) {
      const listing = next("page listing", (m) =>
        m.__selector === "_rpc_applicationSentListing:" && m.__argument.WIRApplicationIdentifierKey === app ? m.__argument.WIRListingKey : undefined
      );
      send("_rpc_forwardGetListing:", { WIRApplicationIdentifierKey: app });
      page = Object.values(await listing).find((p) => p.WIRURLKey === url);
      if (!page) {
        if (Date.now() - start > waitMs) throw new Error(`Safari lists no page at ${url} after ${waitMs / 1000} s`);
        await sleep(500);
      }
    }
    const pageId = page.WIRPageIdentifierKey;
    const forward = (json) =>
      send("_rpc_forwardSocketData:", {
        WIRApplicationIdentifierKey: app,
        WIRPageIdentifierKey: pageId,
        WIRSenderKey: sender,
        WIRSocketDataKey: Buffer.from(JSON.stringify(json)),
      });
    // the page's protocol messages, unwrapped from their target
    const fromPage = new Set();
    let target = null;
    listeners.add((m) => {
      if (m.__selector !== "_rpc_applicationSentData:" || m.__argument.WIRDestinationKey !== sender) return;
      const j = JSON.parse(m.__argument.WIRMessageDataKey.toString("utf8"));
      if (j.method === "Target.targetCreated" && j.params.targetInfo.type === "page") target = target || j.params.targetInfo.targetId;
      const inner = j.method === "Target.dispatchMessageFromTarget" ? JSON.parse(j.params.message) : j;
      for (const l of [...fromPage]) l(inner);
    });
    send("_rpc_forwardSocketSetup:", { WIRApplicationIdentifierKey: app, WIRPageIdentifierKey: pageId, WIRSenderKey: sender, WIRAutomaticallyPause: false });
    const setup = Date.now();
    while (!target) {
      if (closed) throw closed;
      if (Date.now() - setup > CALL_MS) throw new Error("Web Inspector named no page target");
      await sleep(50);
    }

    let id = 0;
    const call = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id;
        const l = (inner) => {
          if (inner.id !== n) return;
          fromPage.delete(l);
          clearTimeout(timer);
          if (inner.error) reject(new Error(`${method}: ${inner.error.message}`));
          else resolve(inner.result);
        };
        const timer = setTimeout(() => {
          fromPage.delete(l);
          reject(closed || new Error(`${method}: no answer after ${CALL_MS / 1000} s`));
        }, CALL_MS);
        fromPage.add(l);
        forward({ id: ++id, method: "Target.sendMessageToTarget", params: { targetId: target, message: JSON.stringify({ id: n, method, params }) } });
      });

    let root = null;
    return {
      call,
      async run(script, ...args) {
        const r = await call("Runtime.evaluate", {
          expression: `(function () {\n${script}\n}).apply(null, ${JSON.stringify(args)})`,
          returnByValue: true,
        });
        if (r.wasThrown) throw new Error(`script threw: ${r.result.description || JSON.stringify(r.result)}`);
        return r.result.value === undefined ? null : r.result.value;
      },
      async find(css) {
        if (root === null) root = (await call("DOM.getDocument")).root.nodeId;
        return (await call("DOM.querySelectorAll", { nodeId: root, selector: css })).nodeIds;
      },
      async label(nodeId) {
        return (await call("DOM.getAccessibilityPropertiesForNode", { nodeId })).properties.label;
      },
      async attribute(nodeId, name) {
        const a = (await call("DOM.getAttributes", { nodeId })).attributes;
        for (let i = 0; i < a.length; i += 2) if (a[i] === name) return a[i + 1];
        return null;
      },
      close() {
        c.end();
      },
    };
  } catch (err) {
    c.destroy();
    throw err;
  }
}
