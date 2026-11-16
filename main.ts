// The Night He Hooked the Moon — ai-excited-01, iteration 2.
//
// The image ships in this repository as entry.png; the program copies it to
// the output directory, verifying size, format and digest first. The image
// is a rich AI-generated render (a lone fisherman in a rowboat, rod bent
// double, line running up to the giant full moon, his face lit in awe):
// an ordinary scene, one impossible thing, one human reaction — the shape
// the top of this competition's leaderboard rewards.
//
// Format note: entry.png holds JPEG bytes under the name entry.png, which
// the brief allows — the format is told apart by its first bytes, the name
// stays entry.png either way. It is 1024x683 and well under the 1 MiB cap.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
const SOURCE = new URL("./entry.png", import.meta.url);
const DEST = join(OUT_DIR, "entry.png");

// Measured from the shipped file; the copy must match exactly, so both
// graded runs write identical bytes.
const EXPECTED_BYTES = 173785;
const EXPECTED_SHA256 =
  "14745894ca5a0b4a7659d5e0a151154ba5d4cbcbbbf1cac19ddaa87cb09b6d83";

const data = readFileSync(SOURCE);

if (data.length !== EXPECTED_BYTES) {
  throw new Error(
    `entry.png is ${data.length} bytes, expected ${EXPECTED_BYTES}`,
  );
}
if (data.length > 1048576) {
  throw new Error(`entry.png exceeds the 1 MiB cap (${data.length} bytes)`);
}
// JPEG magic: FF D8 FF.
if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) {
  throw new Error("entry.png does not start with JPEG magic bytes");
}
// Dimensions: walk the markers to the first frame header (SOF0/SOF2),
// which carries height then width as two big-endian 16-bit values.
function jpegSize(bytes: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) throw new Error("bad JPEG marker");
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: bytes.readUInt16BE(i + 5),
        width: bytes.readUInt16BE(i + 7),
      };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  throw new Error("no JPEG frame header found");
}
const { width, height } = jpegSize(data);
if (width > 1024 || height > 1024) {
  throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}
const digest = createHash("sha256").update(data).digest("hex");
if (digest !== EXPECTED_SHA256) {
  throw new Error(`entry.png digest mismatch: got ${digest}`);
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SOURCE, DEST);

const written = readFileSync(DEST);
if (!written.equals(data)) {
  throw new Error("output differs from the shipped image");
}
console.log(`wrote ${DEST} (${data.length} bytes, sha256 ${digest})`);
