// One Spark Lights a Galaxy — a single match lights a whole galaxy.
// Node 22, standard library only. Deterministic: fixed seed, no clock,
// no Math.random. Writes one 1024x1024 PNG to MAKEFUN_OUTPUT_DIR/entry.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const buf = new Float32Array(W * H * 3);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261116);

function add(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] += r; buf[i + 1] += g; buf[i + 2] += b;
}

// Soft radial glow: colour scaled by (1 - d/r)^2 inside radius r.
function glow(cx, cy, r, cr, cg, cb, strength) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r) continue;
      const t = 1 - d / r;
      const s = strength * t * t;
      add(x, y, cr * s, cg * s, cb * s);
    }
  }
}

// Soft disc with a hard-ish core and a feathered edge.
function disc(cx, cy, r, cr, cg, cb, strength) {
  const x0 = Math.max(0, Math.floor(cx - r - 2));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 2));
  const y0 = Math.max(0, Math.floor(cy - r - 2));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r + 2) continue;
      const t = d <= r ? 1 : 1 - (d - r) / 2;
      const s = strength * t;
      add(x, y, cr * s, cg * s, cb * s);
    }
  }
}

// Thick soft line segment, used for the matchstick and the god-rays.
// The beam fades along its length (fade 0 = constant, 1 = fades to nothing).
function thickLine(x0, y0, x1, y1, half, cr, cg, cb, strength, fade = 0) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len;
  const steps = Math.ceil(len);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + dx * t, cy = y0 + dy * t;
    const w = half * (1 - 0.25 * t);
    const bx0 = Math.max(0, Math.floor(cx - w - 2));
    const bx1 = Math.min(W - 1, Math.ceil(cx + w + 2));
    const by0 = Math.max(0, Math.floor(cy - w - 2));
    const by1 = Math.min(H - 1, Math.ceil(cy + w + 2));
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const px = x - cx, py = y - cy;
        const d = Math.abs(px * nx + py * ny);
        if (d >= w + 2) continue;
        const tt = d <= w ? 1 : 1 - (d - w) / 2;
        const f = strength * (1 - fade * t) * tt * tt;
        add(x, y, cr * f, cg * f, cb * f);
      }
    }
  }
}

// Paint (alpha-blend toward a colour) instead of adding light: the only way
// to draw a genuinely dark object, like the matchstick, over a bright burst.
function paint(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  buf[i] = buf[i] * (1 - a) + r * a;
  buf[i + 1] = buf[i + 1] * (1 - a) + g * a;
  buf[i + 2] = buf[i + 2] * (1 - a) + b * a;
}
function paintDisc(cx, cy, r, cr, cg, cb, alpha) {
  const x0 = Math.max(0, Math.floor(cx - r - 2));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 2));
  const y0 = Math.max(0, Math.floor(cy - r - 2));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r + 2) continue;
      const t = d <= r ? 1 : 1 - (d - r) / 2;
      paint(x, y, cr, cg, cb, alpha * t);
    }
  }
}
function paintLine(x0, y0, x1, y1, half, cr, cg, cb, alpha) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len;
  const steps = Math.ceil(len);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + dx * t, cy = y0 + dy * t;
    const bx0 = Math.max(0, Math.floor(cx - half - 2));
    const bx1 = Math.min(W - 1, Math.ceil(cx + half + 2));
    const by0 = Math.max(0, Math.floor(cy - half - 2));
    const by1 = Math.min(H - 1, Math.ceil(cy + half + 2));
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const px = x - cx, py = y - cy;
        const d = Math.abs(px * nx + py * ny);
        if (d >= half + 2) continue;
        const tt = d <= half ? 1 : 1 - (d - half) / 2;
        paint(x, y, cr, cg, cb, alpha * tt);
      }
    }
  }
}

// ---- 1. Deep-space background: vertical indigo gradient + nebulae ----
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = 0.008 + 0.014 * t;
  const g = 0.006 + 0.011 * t;
  const b = 0.028 + 0.038 * t;
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
  }
}
// Nebula clouds: big soft violet / teal / magenta blobs, mostly upper right.
const nebulae = [
  [760, 180, 330, 0.06, 0.03, 0.13],
  [880, 420, 260, 0.03, 0.04, 0.10],
  [300, 160, 260, 0.04, 0.02, 0.09],
  [180, 560, 220, 0.02, 0.04, 0.07],
  [640, 820, 300, 0.05, 0.02, 0.09],
  [940, 820, 200, 0.02, 0.01, 0.06],
];
for (const n of nebulae) glow(n[0], n[1], n[2], n[3], n[4], n[5], 1);

// ---- 2. Starfield: 900 deterministic stars, rare small cross spikes ----
for (let s = 0; s < 900; s++) {
  const x = rnd() * W;
  const y = rnd() * H;
  const bright = 0.2 + rnd() * rnd() * 1.1;
  const warm = rnd();
  const cr = warm > 0.75 ? 1.0 : 0.85;
  const cg = warm > 0.75 ? 0.85 : 0.9;
  const cb = warm > 0.75 ? 0.7 : 1.0;
  disc(x, y, 1.0, cr * bright, cg * bright, cb * bright, 0.9);
  if (bright > 1.15) {
    const L = 4 + rnd() * 4;
    thickLine(x - L, y, x + L, y, 0.6, cr * bright * 0.4, cg * bright * 0.4, cb * bright * 0.4, 0.35);
    thickLine(x, y - L, x, y + L, 0.6, cr * bright * 0.4, cg * bright * 0.4, cb * bright * 0.4, 0.35);
  }
}

// ---- 3. God-rays: thin beams fanning out from the ignition point ----
// Ignition point (galaxy core) sits upper-centre-right; the match head
// touches it from below-left.
const CX = 640;
const CY = 380;
const rays = [
  [CX, CY, 170, 60, 5],
  [CX, CY, 90, 170, 4],
  [CX, CY, 1000, 110, 5],
  [CX, CY, 980, 690, 4],
  [CX, CY, 470, 970, 4],
  [CX, CY, 140, 640, 3],
];
for (const ray of rays) {
  thickLine(ray[0], ray[1], ray[2], ray[3], ray[4], 1.0, 0.75, 0.35, 0.16, 0.85);
}
// Wide soft halo behind the whole burst.
glow(CX, CY, 380, 0.40, 0.20, 0.60, 0.45);
glow(CX, CY, 260, 0.9, 0.5, 0.25, 0.4);

// ---- 4. The galaxy: logarithmic spiral arms bursting from the match head ----
// Two arms, dense golden stars near the core fading to violet at the rim.
const arms = 2;
const armSpread = 0.95;
for (let a = 0; a < arms; a++) {
  const baseAngle = a * Math.PI;
  for (let i = 0; i < 7500; i++) {
    const t = Math.pow(rnd(), 0.5); // denser near core
    const angle = baseAngle + t * 5.0 + (rnd() - 0.5) * armSpread * (0.5 + t);
    const radius = 10 + t * 280;
    const x = CX + Math.cos(angle) * radius * 1.15;
    const y = CY + Math.sin(angle) * radius * 0.78;
    const heat = 1 - t; // hot core -> cool rim
    const cr = 1.0;
    const cg = 0.5 + 0.42 * heat;
    const cb = 0.12 + 0.25 * (1 - heat);
    const size = 1.2 + rnd() * (1.8 + 2.6 * heat);
    const bright = (0.45 + rnd() * 0.9) * (0.45 + 0.55 * heat);
    disc(x, y, size, cr * bright, cg * bright, cb * bright, 0.9);
  }
}
// Continuous dusty glow along each arm's centreline so arms read solid.
for (let a = 0; a < arms; a++) {
  const baseAngle = a * Math.PI;
  for (let s = 0; s <= 60; s++) {
    const t = s / 60;
    const angle = baseAngle + t * 5.0;
    const radius = 10 + t * 280;
    const x = CX + Math.cos(angle) * radius * 1.15;
    const y = CY + Math.sin(angle) * radius * 0.78;
    const heat = 1 - t;
    glow(x, y, 16 + 22 * t, 0.9, 0.5 + 0.3 * heat, 0.16 + 0.14 * (1 - heat), 0.10);
  }
}
// Scattered halo stars around the galaxy, denser near the core.
for (let i = 0; i < 1400; i++) {
  const ang = rnd() * Math.PI * 2;
  const rad = Math.pow(rnd(), 1.6) * 320;
  const x = CX + Math.cos(ang) * rad * 1.15;
  const y = CY + Math.sin(ang) * rad * 0.78;
  const bright = 0.3 + rnd() * 0.9;
  disc(x, y, 0.8 + rnd() * 1.2, bright, bright * 0.9, bright, 0.8);
}
// Blazing core: layered white-gold glow + hard white heart.
glow(CX, CY, 130, 1.0, 0.72, 0.30, 1.0);
glow(CX, CY, 70, 1.0, 0.85, 0.55, 1.2);
glow(CX, CY, 34, 1.0, 0.95, 0.85, 1.6);
disc(CX, CY, 15, 1.0, 1.0, 0.95, 2.2);

// ---- 5. The matchstick: dark diagonal shaft rising into the flame ----
// Drawn AFTER the galaxy so it stays readable against the burst.
// Shaft from lower-left up to the head just below-left of the core.
const MX0 = 120, MY0 = 920, MX1 = 540, MY1 = 490;
// Painted dark wood (additive light cannot darken): a soft warm rim first,
// then the dark shaft, a lighter wood core, and a lit upper edge.
thickLine(MX0, MY0, MX1, MY1, 24, 0.5, 0.25, 0.07, 0.35);
paintLine(MX0, MY0, MX1, MY1, 18, 0.10, 0.045, 0.015, 1.0);
paintLine(MX0, MY0, MX1, MY1, 12, 0.28, 0.13, 0.05, 0.9);
paintLine(MX0 + 5, MY0 - 10, MX1 + 5, MY1 - 10, 3, 0.85, 0.5, 0.22, 0.85);
// Match head: painted dark ember bulb at the end of the shaft.
paintDisc(552, 478, 30, 0.16, 0.05, 0.02, 1.0);
paintDisc(552, 478, 21, 0.38, 0.11, 0.03, 1.0);
disc(552, 478, 12, 0.95, 0.45, 0.12, 1.0);
// Flame licking up from the head into the core.
glow(580, 440, 55, 1.0, 0.55, 0.10, 1.1);
glow(592, 420, 30, 1.0, 0.8, 0.35, 1.3);
disc(592, 420, 13, 1.0, 0.95, 0.7, 1.8);
// Sparks flying off the ignition.
for (let i = 0; i < 90; i++) {
  const ang = rnd() * Math.PI * 2;
  const rad = 30 + rnd() * rnd() * 190;
  const x = CX + Math.cos(ang) * rad;
  const y = CY + Math.sin(ang) * rad * 0.8 - rad * 0.15;
  const b = 0.7 + rnd() * 1.2;
  disc(x, y, 1.0 + rnd() * 1.4, b, b * 0.7, b * 0.3, 1.0);
}

// ---- 6. Vignette + tone map + ordered dither, then PNG encode ----
const bayer = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
];
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; // filter: None
  const vy = (y - H / 2) / (H / 2);
  for (let x = 0; x < W; x++) {
    const vx = (x - W / 2) / (W / 2);
    const vig = 1 - 0.22 * (vx * vx + vy * vy);
    const i = (y * W + x) * 3;
    const dith = (bayer[y & 3][x & 3] - 7.5) / 16 / 255;
    for (let c = 0; c < 3; c++) {
      let v = buf[i + c] * vig;
      v = v / (1 + v * 0.55); // soft shoulder, keeps the core from clipping flat
      v = Math.pow(Math.max(0, v), 1 / 2.2);
      v = Math.min(1, Math.max(0, v + dith));
      raw[rowStart + 1 + x * 3 + c] = Math.round(v * 255);
    }
  }
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote ${join(outDir, 'entry.png')} ${png.length} bytes ${W}x${H}`);
