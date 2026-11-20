// Copies the MediaPipe WebAssembly runtime into public/ so it is served from our own origin,
// and writes the PNG/ICO icons (generated, no binary files are committed for them).
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
if (existsSync(src)) {
  mkdirSync("public/mediapipe-wasm", { recursive: true });
  cpSync(src, "public/mediapipe-wasm", { recursive: true });
}

// --- icon rendering: black rounded square, white dot and white dash (matches favicon.svg) ---
function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function inRoundRect(x, y, rx, ry, w, h, r) {
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= rx && x <= rx + w && y >= ry && y <= ry + h;
}

function renderPng(size) {
  const s = size / 64;
  const ss = 3; // supersampling per axis
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let white = 0;
      for (let i = 0; i < ss; i++)
        for (let j = 0; j < ss; j++) {
          const px = (x + (i + 0.5) / ss) / s;
          const py = (y + (j + 0.5) / ss) / s;
          const dot = (px - 19) ** 2 + (py - 32) ** 2 <= 49;
          const dash = inRoundRect(px, py, 31, 25, 21, 14, 7);
          if (dot || dash) white++;
        }
      const v = Math.round((255 * white) / (ss * ss));
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = raw[o + 1] = raw[o + 2] = v;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
const png48 = renderPng(48);
writeFileSync("public/icon-192.png", renderPng(192));
writeFileSync("public/icon-512.png", renderPng(512));
writeFileSync("public/apple-touch-icon.png", renderPng(180));

// ICO container wrapping a 48x48 PNG
const hdr = Buffer.alloc(22);
hdr.writeUInt16LE(0, 0);
hdr.writeUInt16LE(1, 2);
hdr.writeUInt16LE(1, 4);
hdr[6] = 48;
hdr[7] = 48;
hdr.writeUInt16LE(1, 10);
hdr.writeUInt16LE(32, 12);
hdr.writeUInt32LE(png48.length, 14);
hdr.writeUInt32LE(22, 18);
writeFileSync("public/favicon.ico", Buffer.concat([hdr, png48]));
