// The Night He Hooked the Moon — ai-excited-01 round 4 entry runner.
// Node 22, standard library only. Reads entry.png next to this file,
// verifies it against the competition gates, and copies it to /output.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "entry.png");
const OUT_DIR = "/output";
const OUT_FILE = join(OUT_DIR, "entry.png");
const MAX_BYTES = 1024 * 1024;
const MIN_BYTES = 1024; // a real 1024x683 photo is never smaller than this
const MAX_SIDE = 1024;
const EXPECTED_SHA256 =
  "38d861050b3bb0e46df394c6dc54565964ef4fa4ccc0a0bc721d8aa12fd63dd1";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function parsePngDimensions(buf) {
  // PNG signature (8 bytes) then IHDR chunk: length (4) + "IHDR" (4),
  // then width (4, big-endian) and height (4, big-endian).
  if (buf.length < 24) fail("PNG file too short for an IHDR chunk");
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, format: "PNG" };
}

function parseJpegDimensions(buf) {
  // Walk JPEG markers until a Start Of Frame marker (SOF0 0xC0 or
  // SOF2 0xC2) gives height then width, both big-endian 16-bit.
  let offset = 2; // skip the SOI marker (FF D8)
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) fail("bad JPEG marker prefix while scanning");
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) fail("reached end of JPEG without a frame header");
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2) fail("bad JPEG segment length while scanning");
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height, format: "JPEG" };
    }
    offset += 2 + length;
  }
  fail("no JPEG frame header found");
}

function main() {
  if (!existsSync(SOURCE)) fail(`entry image not found: ${SOURCE}`);
  const bytes = readFileSync(SOURCE);

  if (bytes.length === 0) fail("entry image is empty");
  if (bytes.length < MIN_BYTES) {
    fail(`entry image is only ${bytes.length} bytes, suspiciously small`);
  }
  if (bytes.length > MAX_BYTES) {
    fail(`entry image is ${bytes.length} bytes, over the 1 MiB limit`);
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    fail("entry image is neither JPEG nor PNG (bad magic bytes)");
  }

  const dims = isJpeg ? parseJpegDimensions(bytes) : parsePngDimensions(bytes);
  if (dims.width > MAX_SIDE || dims.height > MAX_SIDE) {
    fail(`dimensions ${dims.width}x${dims.height} exceed ${MAX_SIDE}x${MAX_SIDE}`);
  }
  if (dims.width === 0 || dims.height === 0) fail("entry image has a zero side");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== EXPECTED_SHA256) {
    fail(`sha256 mismatch: got ${sha256}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, bytes);

  console.log(`format: ${dims.format}`);
  console.log(`dimensions: ${dims.width}x${dims.height} (limit ${MAX_SIDE}x${MAX_SIDE})`);
  console.log(`size: ${bytes.length} bytes (limit ${MAX_BYTES})`);
  console.log(`sha256: ${sha256}`);
  console.log(`wrote: ${OUT_FILE}`);
  console.log("OK: The Night He Hooked the Moon is verified and ready.");
}

main();
