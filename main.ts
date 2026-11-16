// Make the AI judge excited — six deterministic renders, one winner.
// Node 22, standard library only. Deterministic: fixed seeds, no clock,
// no Math.random. VARIANT env selects the scene (1-6); default is the
// winning variant. Writes one 1024x1024 PNG to MAKEFUN_OUTPUT_DIR/entry.png.
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

// Thick soft line segment. The beam fades along its length
// (fade 0 = constant, 1 = fades to nothing).
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
// to draw a genuinely dark object over a bright burst.
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
function paintRect(x0, y0, x1, y1, cr, cg, cb, alpha) {
  const xa = Math.max(0, Math.floor(x0)), xb = Math.min(W - 1, Math.ceil(x1));
  const ya = Math.max(0, Math.floor(y0)), yb = Math.min(H - 1, Math.ceil(y1));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) paint(x, y, cr, cg, cb, alpha);
  }
}

// Bright ring: small discs stepped around a circle.
function ring(cx, cy, r, half, cr, cg, cb, strength) {
  const steps = Math.max(24, Math.ceil(2 * Math.PI * r));
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, half, cr, cg, cb, strength);
  }
}

// Elliptical ring (accretion disc / planet ring), optionally rotated and
// with brightness varying by angle (Doppler beaming: brightFn(a) in 0..1).
function ringEllipse(cx, cy, rx, ry, rot, half, cr, cg, cb, strength, brightFn) {
  const steps = Math.max(48, Math.ceil(2 * Math.PI * Math.max(rx, ry)));
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const x = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
    const y = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
    const b = brightFn ? brightFn(a) : 1;
    if (b <= 0.02) continue;
    disc(x, y, half, cr * b, cg * b, cb * b, strength);
  }
}

// Cross starburst spikes.
function starburst(cx, cy, len, cr, cg, cb, strength) {
  thickLine(cx - len, cy, cx + len, cy, 1.2, cr, cg, cb, strength, 0.7);
  thickLine(cx, cy - len, cx, cy + len, 1.2, cr, cg, cb, strength, 0.7);
  thickLine(cx - len * 0.7, cy - len * 0.7, cx + len * 0.7, cy + len * 0.7, 0.8, cr, cg, cb, strength * 0.7, 0.7);
  thickLine(cx - len * 0.7, cy + len * 0.7, cx + len * 0.7, cy - len * 0.7, 0.8, cr, cg, cb, strength * 0.7, 0.7);
}

// Deep-space background: vertical gradient + nebula blobs + starfield.
function background(top, bottom, nebulae, starSeed, starCount, rnd) {
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = top[0] + (bottom[0] - top[0]) * t;
    const g = top[1] + (bottom[1] - top[1]) * t;
    const b = top[2] + (bottom[2] - top[2]) * t;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
    }
  }
  for (const n of nebulae) glow(n[0], n[1], n[2], n[3], n[4], n[5], 1);
  const srnd = mulberry32(starSeed);
  for (let s = 0; s < starCount; s++) {
    const x = srnd() * W;
    const y = srnd() * H;
    const bright = 0.2 + srnd() * srnd() * 1.1;
    const warm = srnd();
    const cr = warm > 0.75 ? 1.0 : 0.85;
    const cg = warm > 0.75 ? 0.85 : 0.9;
    const cb = warm > 0.75 ? 0.7 : 1.0;
    disc(x, y, 1.0, cr * bright, cg * bright, cb * bright, 0.9);
    if (bright > 1.15) {
      const L = 4 + srnd() * 4;
      thickLine(x - L, y, x + L, y, 0.6, cr * bright * 0.4, cg * bright * 0.4, cb * bright * 0.4, 0.35);
      thickLine(x, y - L, x, y + L, 0.6, cr * bright * 0.4, cg * bright * 0.4, cb * bright * 0.4, 0.35);
    }
  }
  void rnd;
}

// One logarithmic spiral galaxy. colourFn(t) returns [r,g,b] for arm
// position t (0 = core, 1 = rim).
function spiral(cx, cy, arms, radius, baseAngle, count, colourFn, rnd) {
  const armSpread = 0.95;
  for (let a = 0; a < arms; a++) {
    const ba = baseAngle + a * Math.PI;
    for (let i = 0; i < count; i++) {
      const t = Math.pow(rnd(), 0.5);
      const angle = ba + t * 5.0 + (rnd() - 0.5) * armSpread * (0.5 + t);
      const rad = 10 + t * radius;
      const x = cx + Math.cos(angle) * rad * 1.15;
      const y = cy + Math.sin(angle) * rad * 0.78;
      const heat = 1 - t;
      const c = colourFn(t, heat);
      const size = 1.2 + rnd() * (1.8 + 2.6 * heat);
      const bright = (0.45 + rnd() * 0.9) * (0.45 + 0.55 * heat);
      disc(x, y, size, c[0] * bright, c[1] * bright, c[2] * bright, 0.9);
    }
    // Continuous dusty glow along each arm's centreline.
    for (let s = 0; s <= 60; s++) {
      const t = s / 60;
      const angle = ba + t * 5.0;
      const rad = 10 + t * radius;
      const x = cx + Math.cos(angle) * rad * 1.15;
      const y = cy + Math.sin(angle) * rad * 0.78;
      const c = colourFn(t, 1 - t);
      glow(x, y, 16 + 22 * t, c[0] * 0.9, c[1] * 0.9, c[2] * 0.9, 0.10);
    }
  }
}

// ---- V1 (baseline): One Spark Lights a Galaxy ----
// A match lights a whole spiral galaxy. Ignition point upper-centre-right.
function sceneGalaxy() {
  const rnd = mulberry32(20261116);
  background([0.008, 0.006, 0.028], [0.022, 0.017, 0.066], [
    [760, 180, 330, 0.06, 0.03, 0.13],
    [880, 420, 260, 0.03, 0.04, 0.10],
    [300, 160, 260, 0.04, 0.02, 0.09],
    [180, 560, 220, 0.02, 0.04, 0.07],
    [640, 820, 300, 0.05, 0.02, 0.09],
    [940, 820, 200, 0.02, 0.01, 0.06],
  ], 20261117, 900, rnd);
  const CX = 640, CY = 380;
  // God-rays fanning out from the ignition point.
  const rays = [
    [CX, CY, 170, 60, 5], [CX, CY, 90, 170, 4], [CX, CY, 1000, 110, 5],
    [CX, CY, 980, 690, 4], [CX, CY, 470, 970, 4], [CX, CY, 140, 640, 3],
  ];
  for (const ray of rays) {
    thickLine(ray[0], ray[1], ray[2], ray[3], ray[4], 1.0, 0.75, 0.35, 0.16, 0.85);
  }
  glow(CX, CY, 380, 0.40, 0.20, 0.60, 0.45);
  glow(CX, CY, 260, 0.9, 0.5, 0.25, 0.4);
  // Two-arm golden spiral, hot core fading to violet at the rim.
  spiral(CX, CY, 2, 280, 0, 7500, (t, heat) => [1.0, 0.5 + 0.42 * heat, 0.12 + 0.25 * (1 - heat)], rnd);
  // Scattered halo stars, denser near the core.
  for (let i = 0; i < 1400; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 1.6) * 320;
    const x = CX + Math.cos(ang) * rad * 1.15;
    const y = CY + Math.sin(ang) * rad * 0.78;
    const bright = 0.3 + rnd() * 0.9;
    disc(x, y, 0.8 + rnd() * 1.2, bright, bright * 0.9, bright, 0.8);
  }
  // Blazing core.
  glow(CX, CY, 130, 1.0, 0.72, 0.30, 1.0);
  glow(CX, CY, 70, 1.0, 0.85, 0.55, 1.2);
  glow(CX, CY, 34, 1.0, 0.95, 0.85, 1.6);
  disc(CX, CY, 15, 1.0, 1.0, 0.95, 2.2);
  // The matchstick: dark diagonal shaft rising into the flame.
  const MX0 = 120, MY0 = 920, MX1 = 540, MY1 = 490;
  thickLine(MX0, MY0, MX1, MY1, 24, 0.5, 0.25, 0.07, 0.35);
  paintLine(MX0, MY0, MX1, MY1, 18, 0.10, 0.045, 0.015, 1.0);
  paintLine(MX0, MY0, MX1, MY1, 12, 0.28, 0.13, 0.05, 0.9);
  paintLine(MX0 + 5, MY0 - 10, MX1 + 5, MY1 - 10, 3, 0.85, 0.5, 0.22, 0.85);
  paintDisc(552, 478, 30, 0.16, 0.05, 0.02, 1.0);
  paintDisc(552, 478, 21, 0.38, 0.11, 0.03, 1.0);
  disc(552, 478, 12, 0.95, 0.45, 0.12, 1.0);
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
}

// ---- V2: The Last Watcher of a Dying Star ----
// A supernova detonates; one tiny astronaut on a lone asteroid watches it
// die. The scale contrast is the surprise: the biggest death in the
// universe, watched by the smallest witness.
function sceneSupernova() {
  const rnd = mulberry32(20261121);
  background([0.004, 0.004, 0.020], [0.020, 0.010, 0.050], [
    [180, 200, 300, 0.05, 0.02, 0.10],
    [880, 760, 280, 0.02, 0.03, 0.08],
    [480, 120, 240, 0.03, 0.02, 0.07],
  ], 20261122, 700, rnd);
  const CX = 650, CY = 330;
  // The blast: violet halo, cyan shell, white heart.
  glow(CX, CY, 430, 0.50, 0.25, 0.90, 0.55);
  glow(CX, CY, 280, 0.35, 0.60, 1.00, 0.75);
  glow(CX, CY, 150, 0.90, 0.95, 1.00, 1.20);
  glow(CX, CY, 70, 1.00, 1.00, 1.00, 1.60);
  disc(CX, CY, 30, 1.0, 1.0, 1.0, 2.4);
  disc(CX, CY, 15, 1.0, 1.0, 1.0, 2.6);
  starburst(CX, CY, 150, 1.0, 0.95, 0.9, 0.9);
  // Expanding shockwave rings.
  ring(CX, CY, 95, 2.0, 0.80, 0.95, 1.00, 1.3);
  ring(CX, CY, 175, 2.5, 0.60, 0.80, 1.00, 0.9);
  ring(CX, CY, 265, 2.0, 0.40, 0.60, 1.00, 0.6);
  ring(CX, CY, 355, 1.5, 0.30, 0.45, 0.90, 0.4);
  // Debris streaks racing outward.
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = 55 + rnd() * 40;
    const r1 = 260 + rnd() * rnd() * 260;
    const x0 = CX + Math.cos(a) * r0, y0 = CY + Math.sin(a) * r0;
    const x1 = CX + Math.cos(a) * r1, y1 = CY + Math.sin(a) * r1;
    const warm = rnd();
    const cr = warm > 0.6 ? 1.0 : 0.75;
    const cg = warm > 0.6 ? 0.75 : 0.9;
    const cb = 1.0;
    thickLine(x0, y0, x1, y1, 1.2 + rnd() * 1.8, cr, cg, cb, 0.9, 0.75);
  }
  // Glowing embers thrown ahead of the rings.
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = 120 + rnd() * 380;
    const x = CX + Math.cos(a) * rad;
    const y = CY + Math.sin(a) * rad;
    const b = 0.6 + rnd() * 1.3;
    disc(x, y, 1.0 + rnd() * 1.6, b, b * 0.8, b * 0.9, 1.0);
  }
  // The asteroid: dark rock, bottom-left, rim-lit by the blast.
  const AX = 225, AY = 830, AR = 115;
  paintDisc(AX, AY, AR, 0.045, 0.040, 0.060, 1.0);
  paintDisc(AX - 30, AY + 25, 22, 0.020, 0.018, 0.028, 1.0);
  paintDisc(AX + 38, AY + 42, 15, 0.020, 0.018, 0.028, 1.0);
  paintDisc(AX + 8, AY - 8, 12, 0.025, 0.022, 0.032, 1.0);
  // Rim light on the blast-facing edge: overlapping soft glows along the
  // arc so it reads as one continuous lit rim, not beads.
  for (let s = 0; s <= 40; s++) {
    const a = Math.PI * (0.95 + (s / 40) * 0.55); // upper-right arc
    const x = AX + Math.cos(a) * (AR - 4);
    const y = AY + Math.sin(a) * (AR - 4);
    glow(x, y, 7, 0.95, 0.75, 0.55, 0.8);
  }
  glow(AX + 40, AY - 60, 90, 0.5, 0.65, 1.0, 0.25);
  // The watcher: a tiny astronaut standing on the rock, one arm raised
  // toward the dying star. White suit, dark visor.
  const HX = 225, HY = 700; // helmet centre (top of the rock)
  paintLine(HX, HY + 8, HX, HY + 28, 3.2, 0.95, 0.95, 1.0, 1.0); // body
  paintLine(HX, HY + 28, HX - 8, HY + 42, 2.4, 0.95, 0.95, 1.0, 1.0); // leg L
  paintLine(HX, HY + 28, HX + 8, HY + 42, 2.4, 0.95, 0.95, 1.0, 1.0); // leg R
  paintLine(HX, HY + 12, HX + 16, HY - 4, 2.2, 0.95, 0.95, 1.0, 1.0); // raised arm
  paintLine(HX, HY + 12, HX - 12, HY + 20, 2.2, 0.95, 0.95, 1.0, 1.0); // other arm
  disc(HX, HY, 7.5, 1.0, 1.0, 1.0, 1.0); // helmet
  paintDisc(HX + 2, HY, 4.5, 0.05, 0.10, 0.18, 1.0); // visor
  disc(HX, HY, 10.5, 0.6, 0.8, 1.0, 0.35); // helmet glow
  // A small red beacon blinking on the rock behind the watcher.
  disc(AX + 62, AY - 62, 3.5, 1.0, 0.25, 0.2, 1.6);
  glow(AX + 62, AY - 62, 18, 1.0, 0.25, 0.2, 0.8);
}

// ---- V3: One Probe Into the Dark ----
// A black hole's accretion disc blazes; one tiny probe dives straight into
// it, its glowing trail spiralling down. The surprise is the direction:
// everything flees a black hole — this one flies in.
function sceneBlackHole() {
  const rnd = mulberry32(20261123);
  background([0.002, 0.002, 0.008], [0.010, 0.008, 0.030], [
    [200, 180, 280, 0.04, 0.02, 0.08],
    [850, 220, 260, 0.02, 0.02, 0.06],
    [700, 850, 300, 0.03, 0.015, 0.06],
  ], 20261124, 800, rnd);
  const CX = 512, CY = 460;
  // Wide hot halo around the whole system.
  glow(CX, CY, 380, 0.35, 0.15, 0.05, 0.5);
  glow(CX, CY, 240, 0.55, 0.25, 0.08, 0.55);
  // Relativistic jets, top and bottom.
  thickLine(CX, CY - 130, CX, 30, 7, 0.70, 0.85, 1.00, 0.55, 0.85);
  thickLine(CX, CY - 130, CX, 30, 2.5, 0.90, 0.95, 1.00, 0.9, 0.85);
  thickLine(CX, CY + 130, CX, 1010, 7, 0.70, 0.85, 1.00, 0.55, 0.85);
  thickLine(CX, CY + 130, CX, 1010, 2.5, 0.90, 0.95, 1.00, 0.9, 0.85);
  // Back half of the accretion disc (behind the hole), brighter on the
  // left where matter rushes toward us.
  const beam = (a) => 0.45 + 0.55 * Math.max(0, Math.cos(a + Math.PI * 0.15));
  for (let s = 0; s < 400; s++) {
    const a = Math.PI + (s / 400) * Math.PI; // sin(a) < 0: upper half
    const ex = Math.cos(a) * 330, ey = Math.sin(a) * 115;
    disc(CX + ex, CY + ey, 4.0, 1.0 * beam(a), 0.55 * beam(a), 0.15 * beam(a), 0.8);
    const ix = Math.cos(a) * 205, iy = Math.sin(a) * 72;
    disc(CX + ix, CY + iy, 3.2, 1.0 * beam(a), 0.82 * beam(a), 0.45 * beam(a), 1.0);
    const mx = Math.cos(a) * 268, my = Math.sin(a) * 94;
    disc(CX + mx, CY + my, 3.4, 0.95 * beam(a), 0.68 * beam(a), 0.28 * beam(a), 0.9);
  }
  // The hole itself: pure black, ringed by the photon ring.
  paintDisc(CX, CY, 118, 0.0, 0.0, 0.0, 1.0);
  ring(CX, CY, 122, 2.0, 1.0, 0.90, 0.70, 1.7);
  ring(CX, CY, 132, 1.2, 1.0, 0.70, 0.35, 0.8);
  // Front half of the disc (in front of the hole), same beaming.
  for (let s = 0; s < 400; s++) {
    const a = (s / 400) * Math.PI; // sin(a) > 0: lower half
    const ex = Math.cos(a) * 330, ey = Math.sin(a) * 115;
    disc(CX + ex, CY + ey, 4.0, 1.0 * beam(a), 0.55 * beam(a), 0.15 * beam(a), 0.9);
    const ix = Math.cos(a) * 205, iy = Math.sin(a) * 72;
    disc(CX + ix, CY + iy, 3.2, 1.0 * beam(a), 0.82 * beam(a), 0.45 * beam(a), 1.1);
    const mx = Math.cos(a) * 268, my = Math.sin(a) * 94;
    disc(CX + mx, CY + my, 3.4, 0.95 * beam(a), 0.68 * beam(a), 0.28 * beam(a), 1.0);
  }
  glow(CX, CY, 200, 0.9, 0.5, 0.15, 0.28);
  // Re-blacken the hole AFTER that glow: additive light must never tint it.
  paintDisc(CX, CY, 116, 0.0, 0.0, 0.0, 1.0);
  ring(CX, CY, 120, 2.0, 1.0, 0.90, 0.70, 1.7);
  // The probe's glowing trail: a bezier dive from bottom-left into the
  // disc's front edge, with sparks shedding off it.
  const P0 = [150, 900], P1 = [300, 720], P2 = [395, 560];
  let px = P0[0], py = P0[1];
  for (let s = 0; s <= 90; s++) {
    const t = s / 90;
    const u = 1 - t;
    const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0];
    const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
    const fade = 0.25 + 0.75 * t;
    glow(x, y, 10 + 6 * t, 0.45 * fade, 0.85 * fade, 1.0 * fade, 0.9);
    if (s % 3 === 0) disc(x, y, 1.6, 0.7 * fade, 0.95 * fade, 1.0 * fade, 1.0);
    px = x; py = y;
  }
  for (let i = 0; i < 26; i++) {
    const t = rnd();
    const u = 1 - t;
    const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0] + (rnd() - 0.5) * 26;
    const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1] + (rnd() - 0.5) * 26;
    disc(x, y, 1.0 + rnd() * 1.2, 0.6, 0.9, 1.0, 0.9);
  }
  // The probe itself: white-hot nose at the trail's end, diving in.
  disc(P2[0], P2[1], 7, 1.0, 1.0, 1.0, 2.2);
  glow(P2[0], P2[1], 34, 0.55, 0.9, 1.0, 1.1);
  disc(P2[0] - 8, P2[1] + 8, 3, 0.6, 0.9, 1.0, 1.4);
  void px; void py;
}

// ---- V4: The Night the Sky Caught Fire ----
// Aurora curtains pour over a lone lighthouse whose beam climbs up to meet
// them. The surprise: the lighthouse is not warning ships — it is talking
// to the sky.
function sceneAurora() {
  const rnd = mulberry32(20261125);
  background([0.010, 0.030, 0.080], [0.005, 0.010, 0.030], [
    [820, 150, 260, 0.02, 0.05, 0.10],
    [200, 120, 220, 0.03, 0.02, 0.08],
  ], 20261126, 480, rnd);
  // Aurora curtains: wavy vertical ribbons of light, top two-thirds.
  const curtains = [
    { cx: 210, phase: 0.0, col: [0.15, 1.00, 0.45], core: [0.40, 1.00, 0.60], amp: 55 },
    { cx: 420, phase: 1.3, col: [0.10, 0.90, 0.80], core: [0.35, 1.00, 0.90], amp: 75 },
    { cx: 640, phase: 2.6, col: [0.50, 0.30, 1.00], core: [0.70, 0.55, 1.00], amp: 60 },
    { cx: 850, phase: 4.0, col: [0.15, 1.00, 0.55], core: [0.45, 1.00, 0.70], amp: 70 },
  ];
  for (const c of curtains) {
    for (let y = 40; y <= 560; y += 6) {
      const sway = c.amp * Math.sin(y / 95 + c.phase) + 26 * Math.sin(y / 37 + c.phase * 2);
      const x = c.cx + sway;
      const edge = 0.55 + 0.45 * Math.sin(y / 60 + c.phase);
      glow(x, y, 34, c.col[0] * edge, c.col[1] * edge, c.col[2] * edge, 0.30);
      glow(x + 14 * Math.sin(y / 50), y, 16, c.core[0], c.core[1], c.core[2], 0.35);
    }
    // Bright lower edge where the curtain meets the sky (soft, continuous).
    for (let y = 480; y <= 560; y += 6) {
      const sway = c.amp * Math.sin(y / 95 + c.phase) + 26 * Math.sin(y / 37 + c.phase * 2);
      glow(c.cx + sway, y, 7, c.core[0], c.core[1], c.core[2], 0.6);
    }
  }
  // Soft aurora wash across the top of the sky.
  glow(512, 60, 420, 0.10, 0.45, 0.30, 0.35);
  // The cliff: dark land below a wavy horizon (raised: less dead space).
  const horizon = (x) => 832 + 26 * Math.sin(x / 170) + 10 * Math.sin(x / 53);
  for (let x = 0; x < W; x++) {
    const hy = Math.floor(horizon(x));
    for (let y = hy; y < H; y++) paint(x, y, 0.008, 0.009, 0.016, 1.0);
  }
  // Distant cottage windows: three tiny warm lights on the dark land.
  for (const w of [[300, 940], [332, 955], [855, 915]]) {
    disc(w[0], w[1], 3.2, 1.0, 0.75, 0.35, 1.6);
    glow(w[0], w[1], 14, 1.0, 0.7, 0.3, 0.7);
  }
  // The lighthouse on the cliff at x=700 (taller, so it holds the frame).
  const LX = 700, base = Math.floor(horizon(LX));
  paintRect(LX - 16, base - 195, LX + 16, base, 0.88, 0.86, 0.82, 1.0); // tower
  paintRect(LX - 16, base - 148, LX + 16, base - 116, 0.85, 0.15, 0.12, 1.0); // red band
  paintRect(LX - 16, base - 72, LX + 16, base - 40, 0.85, 0.15, 0.12, 1.0); // red band
  paintRect(LX - 20, base - 222, LX + 20, base - 195, 0.10, 0.10, 0.12, 1.0); // lamp room
  paintRect(LX - 23, base - 229, LX + 23, base - 222, 0.15, 0.15, 0.18, 1.0); // roof
  disc(LX, base - 208, 9, 1.0, 0.95, 0.70, 2.2); // the lamp
  glow(LX, base - 208, 110, 1.0, 0.90, 0.50, 0.65);
  // The beam climbs up-left, into the aurora.
  thickLine(LX, base - 208, 170, 420, 11, 1.0, 0.95, 0.70, 0.32, 0.9);
  thickLine(LX, base - 208, 170, 420, 4, 1.0, 0.98, 0.85, 0.5, 0.9);
  glow(170, 420, 90, 0.45, 0.9, 0.75, 0.3); // where beam meets aurora
  // A faint second beam to the right, sweeping low over the sea-cliff.
  thickLine(LX, base - 208, 1000, 700, 8, 1.0, 0.95, 0.70, 0.18, 0.9);
  void rnd;
}

// ---- V5: Two Galaxies Collide, One Star Is Born ----
// Two spirals crash into each other; at the exact point of impact a new
// star ignites, brighter than either galaxy. Destruction as a birth.
function sceneCollision() {
  const rnd = mulberry32(20261127);
  background([0.006, 0.005, 0.025], [0.020, 0.012, 0.055], [
    [150, 150, 280, 0.05, 0.02, 0.10],
    [880, 180, 260, 0.02, 0.03, 0.09],
    [500, 880, 300, 0.03, 0.02, 0.08],
  ], 20261128, 600, rnd);
  // Galaxy A: gold, upper-left. Galaxy B: violet-blue, lower-right.
  spiral(390, 430, 2, 230, 0.4, 6000, (t, heat) => [1.0, 0.55 + 0.35 * heat, 0.15 + 0.20 * (1 - heat)], rnd);
  spiral(650, 580, 2, 230, 2.2, 6000, (t, heat) => [0.55 + 0.25 * heat, 0.45, 1.0], rnd);
  // Tidal tails: arcs of stars flung outward by the crash.
  const tail = (cx, cy, a0, a1, r0, r1, col) => {
    for (let i = 0; i < 900; i++) {
      const t = rnd();
      const a = a0 + (a1 - a0) * t;
      const r = r0 + (r1 - r0) * t + (rnd() - 0.5) * 26;
      const x = cx + Math.cos(a) * r * 1.15;
      const y = cy + Math.sin(a) * r * 0.78;
      const b = (0.4 + rnd() * 0.8) * (1 - t * 0.5);
      disc(x, y, 0.8 + rnd() * 1.4, col[0] * b, col[1] * b, col[2] * b, 0.9);
    }
  };
  tail(390, 430, -2.4, -0.9, 240, 430, [1.0, 0.7, 0.3]);
  tail(650, 580, 0.7, 2.2, 240, 430, [0.6, 0.5, 1.0]);
  tail(390, 430, 2.6, 3.6, 240, 400, [1.0, 0.7, 0.3]);
  tail(650, 580, 3.8, 5.0, 240, 400, [0.6, 0.5, 1.0]);
  // Starburst knots where the arms tangle.
  for (const k of [[470, 470], [575, 545], [440, 560], [600, 460]]) {
    glow(k[0], k[1], 42, 1.0, 0.85, 0.55, 0.7);
    disc(k[0], k[1], 5, 1.0, 0.95, 0.8, 1.8);
    starburst(k[0], k[1], 26, 1.0, 0.9, 0.7, 0.6);
  }
  // The newborn star at the impact point: brighter than both galaxies.
  const NX = 520, NY = 505;
  glow(NX, NY, 260, 1.0, 0.80, 0.45, 0.9);
  glow(NX, NY, 130, 1.0, 0.90, 0.60, 1.1);
  glow(NX, NY, 60, 1.0, 0.97, 0.85, 1.5);
  disc(NX, NY, 17, 1.0, 1.0, 0.95, 2.4);
  starburst(NX, NY, 110, 1.0, 0.95, 0.8, 1.0);
  starburst(NX, NY, 55, 1.0, 1.0, 1.0, 1.2);
  // Shockwave ring racing out from the birth (kept faint: a whisper, not a diagram).
  ring(NX, NY, 150, 1.5, 1.0, 0.85, 0.5, 0.45);
  ring(NX, NY, 210, 1.2, 0.9, 0.7, 0.4, 0.3);
}

// ---- V6: Riding the Light Home ----
// A comet tears across the sky and one tiny surfer rides its glowing tail
// past a ringed planet. The fastest ride in the solar system, and someone
// is actually on it.
function sceneComet() {
  const rnd = mulberry32(20261129);
  background([0.004, 0.005, 0.022], [0.018, 0.012, 0.045], [
    [200, 180, 280, 0.04, 0.02, 0.09],
    [850, 200, 240, 0.02, 0.03, 0.07],
    [480, 880, 300, 0.03, 0.02, 0.07],
  ], 20261130, 800, rnd);
  // The ringed planet, bottom-right: dark sphere, lit rim, tilted ring.
  const PX = 800, PY = 830;
  glow(PX, PY, 260, 0.10, 0.12, 0.25, 0.5);
  paintDisc(PX, PY, 130, 0.035, 0.035, 0.070, 1.0);
  paintDisc(PX - 28, PY - 28, 92, 0.055, 0.055, 0.100, 1.0);
  // Lit rim on the comet-facing edge: overlapping soft glows, one rim.
  for (let s = 0; s <= 40; s++) {
    const a = Math.PI * (0.85 + (s / 40) * 0.6);
    glow(PX + Math.cos(a) * 128, PY + Math.sin(a) * 128, 7, 0.7, 0.9, 1.0, 0.7);
  }
  // Tilted ring, dimmer so it reads as a ring, not neon.
  ringEllipse(PX, PY, 215, 48, -0.35, 2.0, 0.75, 0.85, 1.0, 0.55, (a) => 0.4 + 0.6 * Math.max(0, Math.sin(a)));
  ringEllipse(PX, PY, 185, 40, -0.35, 1.4, 0.9, 0.95, 1.0, 0.5, (a) => 0.4 + 0.6 * Math.max(0, Math.sin(a)));
  // The comet head: white-hot, top-centre-right.
  const HX = 690, HY = 270;
  glow(HX, HY, 240, 0.35, 0.70, 1.00, 0.8);
  glow(HX, HY, 110, 0.70, 0.90, 1.00, 1.1);
  glow(HX, HY, 48, 1.00, 1.00, 1.00, 1.5);
  disc(HX, HY, 20, 1.0, 1.0, 1.0, 2.4);
  starburst(HX, HY, 70, 0.85, 0.95, 1.0, 0.8);
  // The tail: a fan of streaks sweeping down-left from the head, with
  // gaps between them so it reads as gas and light, not a solid wedge.
  const TX = 130, TY = 720; // tail tip
  for (let i = 0; i < 64; i++) {
    if (rnd() < 0.28) continue; // gaps in the fan
    const t = rnd();
    const spread = (rnd() - 0.5) * 190;
    const ex = TX + spread * 0.4, ey = TY + spread;
    const sx = HX + (rnd() - 0.5) * 30, sy = HY + (rnd() - 0.5) * 30;
    const cool = rnd();
    thickLine(sx, sy, ex, ey, 0.8 + rnd() * 1.6, 0.55 + 0.3 * cool, 0.80, 1.0, 0.38, 0.85);
  }
  // Soft glowing spine along the tail so it reads as one solid river.
  for (let s = 0; s <= 40; s++) {
    const t = s / 40;
    const x = HX + (TX - HX) * t;
    const y = HY + (TY - HY) * t + 40 * Math.sin(t * Math.PI);
    glow(x, y, 26 + 44 * t, 0.35, 0.65, 1.0, 0.22);
  }
  // Tail sparks.
  for (let i = 0; i < 80; i++) {
    const t = rnd();
    const x = HX + (TX - HX) * t + (rnd() - 0.5) * 120 * t;
    const y = HY + (TY - HY) * t + 40 * Math.sin(t * Math.PI) + (rnd() - 0.5) * 120 * t;
    const b = 0.5 + rnd() * 1.0;
    disc(x, y, 1.0 + rnd() * 1.3, b * 0.7, b * 0.9, b, 1.0);
  }
  // The surfer: a tiny figure on a board, riding the tail's spine.
  const SX = 425, SY = 520;
  glow(SX, SY, 46, 0.5, 0.85, 1.0, 0.7); // wake glow
  paintLine(SX - 14, SY + 10, SX + 16, SY - 2, 2.6, 0.95, 0.98, 1.0, 1.0); // board
  paintLine(SX - 2, SY - 2, SX - 2, SY - 20, 2.8, 0.95, 0.95, 1.0, 1.0); // body
  paintLine(SX - 2, SY - 20, SX - 12, SY - 30, 2.2, 0.95, 0.95, 1.0, 1.0); // back arm
  paintLine(SX - 2, SY - 20, SX + 10, SY - 28, 2.2, 0.95, 0.95, 1.0, 1.0); // front arm
  disc(SX - 2, SY - 26, 6, 1.0, 1.0, 1.0, 1.0); // helmet
  paintDisc(SX, SY - 26, 3.6, 0.05, 0.10, 0.18, 1.0); // visor
}

// ---- Dispatch ----
const TITLES = {
  1: 'One Spark Lights a Galaxy',
  2: 'The Last Watcher of a Dying Star',
  3: 'One Probe Into the Dark',
  4: 'The Night the Sky Caught Fire',
  5: 'Two Galaxies Collide, One Star Is Born',
  6: 'Riding the Light Home',
};
const variant = Math.min(6, Math.max(1, parseInt(process.env.VARIANT ?? '2', 10) || 2));
if (variant === 1) sceneGalaxy();
else if (variant === 2) sceneSupernova();
else if (variant === 3) sceneBlackHole();
else if (variant === 4) sceneAurora();
else if (variant === 5) sceneCollision();
else sceneComet();

// ---- Vignette + tone map + ordered dither, then PNG encode ----
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
console.log(`wrote ${join(outDir, 'entry.png')} ${png.length} bytes ${W}x${H} variant ${variant} "${TITLES[variant]}"`);
