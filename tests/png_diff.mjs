// PNG helpers for tests/native_check.mjs. tests/helpers_test.mjs tests them.
//
// decodePng(buf) gives { width, height, data } (RGBA bytes) of an 8-bit,
// non-interlaced RGB or RGBA PNG, and throws on any other PNG.
// diffShare(a, b, { shift, pixelDiff, block }) compares two decoded images
// of one size by the average color of square blocks, at the best small shift
// (see the function).

import zlib from "node:zlib";

// RGBA bytes of an 8-bit, non-interlaced RGB or RGBA PNG (what puppeteer and
// safaridriver return)
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let width, height, colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colorType = body[9];
      if (body[8] !== 8 || body[12] !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`PNG bit depth ${body[8]}, color type ${colorType}, interlace ${body[12]} is not read`);
      }
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x] + add) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * bpp];
      out[o + 1] = line[x * bpp + 1];
      out[o + 2] = line[x * bpp + 2];
      out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

// The smallest share of blocks that differ over every shift of b by up to
// `shift` pixels each way, and that shift: { share, dx, dy }; null when the
// sizes differ. The images are cut into squares of `block` x `block` pixels
// (the edge `shift` pixels of a and any part block left out); a block differs
// when the average of one of its red, green, or blue channels differs by more
// than `pixelDiff`. The shift absorbs where a viewer puts the page under a
// fractional element position (desktop Safari 27.0.1 put the same page one
// pixel apart), and the average absorbs text edges drawn a fraction of a
// pixel apart (Firefox 158 at scale 1), while another page or PDF moves whole
// lines of text and so changes many blocks.
export function diffShare(a, b, { shift = 2, pixelDiff = 40, block = 4 } = {}) {
  if (a.width !== b.width || a.height !== b.height) return null;
  const bw = Math.floor((a.width - 2 * shift) / block);
  const bh = Math.floor((a.height - 2 * shift) / block);
  if (bw < 1 || bh < 1) return null;
  const limit = pixelDiff * block * block;
  let best = null;
  for (let dy = -shift; dy <= shift; dy++) {
    for (let dx = -shift; dx <= shift; dx++) {
      let n = 0;
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          let r = 0, g = 0, bl = 0;
          for (let y = 0; y < block; y++) {
            const ay = shift + by * block + y;
            for (let x = 0; x < block; x++) {
              const ax = shift + bx * block + x;
              const i = (ay * a.width + ax) * 4;
              const j = ((ay + dy) * a.width + ax + dx) * 4;
              r += a.data[i] - b.data[j];
              g += a.data[i + 1] - b.data[j + 1];
              bl += a.data[i + 2] - b.data[j + 2];
            }
          }
          if (Math.abs(r) > limit || Math.abs(g) > limit || Math.abs(bl) > limit) n++;
        }
      }
      const share = n / (bw * bh);
      if (!best || share < best.share) best = { share, dx, dy };
    }
  }
  return best;
}
