import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPng(width, height, drawFn) {
  // RGBA buffer
  const rowSize = width * 4 + 1; // +1 for filter byte (0)
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  // Precompute CRC32 table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Background gradient: dark indigo to navy
  const normY = y / h;
  let bgR = Math.floor(15 + normY * 10);
  let bgG = Math.floor(23 + normY * 40);
  let bgB = Math.floor(42 + normY * 120);

  // Rounded corner for non-maskable
  const cornerR = w * 0.22;
  if (!isMaskable) {
    const rx = Math.max(0, Math.abs(dx) - (w / 2 - cornerR));
    const ry = Math.max(0, Math.abs(dy) - (h / 2 - cornerR));
    if (rx * rx + ry * ry > cornerR * cornerR) {
      return [0, 0, 0, 0]; // Transparent
    }
  }

  // Scale factor for content
  const scale = isMaskable ? 0.7 : 0.85;
  const mx = dx / scale;
  const my = (dy + (h * 0.04)) / scale; // center microphone

  // Outer concentric wave rings
  const mDist = Math.sqrt(mx * mx + my * my);
  if (Math.abs(mDist - w * 0.35) < 3 || Math.abs(mDist - w * 0.42) < 2) {
    return [56, 189, 248, 200]; // Cyan wave
  }

  // Waveform bars
  if (Math.abs(my) < 40 && Math.abs(mx) > 45 && Math.abs(mx) < 120) {
    const barIndex = Math.floor((Math.abs(mx) - 45) / 18);
    const heights = [35, 60, 45, 25];
    const maxH = heights[barIndex] || 10;
    if (Math.abs(my) < maxH && (Math.abs(mx) - 45) % 18 < 8) {
      return [129, 140, 248, 240]; // Purple bar
    }
  }

  // Microphone Capsule: width 48, height 90
  const capHalfW = 24;
  const capTop = -50;
  const capBottom = 20;

  let inCapsule = false;
  if (Math.abs(mx) <= capHalfW && my >= capTop + capHalfW && my <= capBottom - capHalfW) {
    inCapsule = true;
  } else if (Math.abs(mx) <= capHalfW) {
    const dTop = Math.sqrt(mx * mx + (my - (capTop + capHalfW)) ** 2);
    const dBot = Math.sqrt(mx * mx + (my - (capBottom - capHalfW)) ** 2);
    if (dTop <= capHalfW || dBot <= capHalfW) inCapsule = true;
  }

  if (inCapsule) {
    return [56, 189, 248, 255]; // Bright cyan mic
  }

  // Arc under mic
  const arcR = 42;
  const arcDist = Math.sqrt(mx * mx + (my - 5) ** 2);
  if (arcDist >= arcR - 5 && arcDist <= arcR + 5 && my >= 5 && my <= 48) {
    return [255, 255, 255, 255]; // White arc
  }

  // Stand stem
  if (Math.abs(mx) <= 4 && my >= 46 && my <= 75) {
    return [255, 255, 255, 255];
  }
  // Stand base
  if (Math.abs(mx) <= 26 && my >= 73 && my <= 80) {
    return [255, 255, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => renderIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => renderIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => renderIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => renderIcon(x, y, w, h, true)));

console.log('PWA icons created successfully!');
