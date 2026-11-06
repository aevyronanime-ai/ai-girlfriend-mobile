// Generates high-res PNG icons for AI Girlfriend Mobile App (PWA & Android WebAPK)
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type: RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw scanlines: width * 4 bytes per pixel + 1 filter byte per line
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw the Glowing Cyberpunk Heart Icon with Neural Ring
function renderAIGirlfriendPixel(x, y, width, height, isMaskable = false) {
  // Normalize coordinates to -1.0 .. 1.0
  const nx = (x / width) * 2 - 1;
  const ny = (y / height) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background: Deep futuristic dark gradient (#030712)
  let bgR = 3, bgG = 7, bgB = 18;
  const radialDark = Math.max(0, 1 - dist * 0.8);
  bgR += 28 * radialDark;
  bgG += 6 * radialDark;
  bgB += 24 * radialDark;

  let r = bgR, g = bgG, b = bgB, a = 255;

  if (!isMaskable && dist > 0.96) {
    // Round corners for standard icon
    const cornerFade = Math.max(0, Math.min(1, (1.0 - dist) / 0.04));
    a = Math.round(255 * cornerFade);
    if (a === 0) return [0, 0, 0, 0];
  }

  // Neural Outer Ring (dist ~ 0.68)
  const ringDist = Math.abs(dist - 0.68);
  if (ringDist < 0.04) {
    const intensity = (1 - ringDist / 0.04) * 0.7;
    // Neon Pink (#ff2a85) to Cyan (#00f0ff) gradient along angle
    const angle = Math.atan2(ny, nx);
    const t = (Math.sin(angle * 2) + 1) / 2;
    r = r * (1 - intensity) + (255 * (1 - t) + 0 * t) * intensity;
    g = g * (1 - intensity) + (42 * (1 - t) + 240 * t) * intensity;
    b = b * (1 - intensity) + (133 * (1 - t) + 255 * t) * intensity;
  }

  // Inner Thin Circuit Ring (dist ~ 0.54)
  const innerRing = Math.abs(dist - 0.54);
  if (innerRing < 0.02) {
    const intensity = (1 - innerRing / 0.02) * 0.6;
    r = r * (1 - intensity) + 0 * intensity;
    g = g * (1 - intensity) + 240 * intensity;
    b = b * (1 - intensity) + 255 * intensity;
  }

  // Glowing Heart Formula
  // Scale and shift coordinates for heart
  const hx = nx * 1.5;
  const hy = -ny * 1.5 + 0.15; // flip Y so heart is upright

  // Implicit heart function: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
  const f = Math.pow(hx * hx + hy * hy - 0.55, 3) - hx * hx * Math.pow(hy, 3);

  if (f <= 0.04) {
    // Inside heart or on edge glow
    const edge = Math.max(0, Math.min(1, (0.04 - f) / 0.04));
    // Color: Vivid Hot Pink (#ff2a85) blending to Violet (#9d4edd) and White core
    const coreDist = Math.sqrt(nx * nx + (ny + 0.05) * (ny + 0.05));
    const coreGlow = Math.max(0, 1 - coreDist * 3.5);

    let hr = 255;
    let hg = 42 + coreGlow * 180;
    let hb = 133 + coreGlow * 122;

    r = r * (1 - edge) + hr * edge;
    g = g * (1 - edge) + hg * edge;
    b = b * (1 - edge) + hb * edge;
  }

  return [r, g, b, a];
}

const ICONS_DIR = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

console.log('Generating PNG icons for AI Girlfriend Mobile...');

// 1. 192x192 Standard Icon
const icon192 = createPng(192, 192, (x, y, w, h) => renderAIGirlfriendPixel(x, y, w, h, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), icon192);
console.log('✅ Generated public/icons/icon-192.png (192x192)');

// 2. 512x512 Standard Icon
const icon512 = createPng(512, 512, (x, y, w, h) => renderAIGirlfriendPixel(x, y, w, h, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), icon512);
console.log('✅ Generated public/icons/icon-512.png (512x512)');

// 3. 192x192 Maskable Icon
const iconMaskable192 = createPng(192, 192, (x, y, w, h) => renderAIGirlfriendPixel(x, y, w, h, true));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-192.png'), iconMaskable192);
console.log('✅ Generated public/icons/icon-maskable-192.png (192x192 maskable)');

// 4. 512x512 Maskable Icon
const iconMaskable512 = createPng(512, 512, (x, y, w, h) => renderAIGirlfriendPixel(x, y, w, h, true));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), iconMaskable512);
console.log('✅ Generated public/icons/icon-maskable-512.png (512x512 maskable)');

// Sync to Android assets
const androidIconsDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public', 'icons');
if (fs.existsSync(androidIconsDir)) {
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-192.png'), path.join(androidIconsDir, 'icon-192.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-512.png'), path.join(androidIconsDir, 'icon-512.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-maskable-192.png'), path.join(androidIconsDir, 'icon-maskable-192.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), path.join(androidIconsDir, 'icon-maskable-512.png'));
  console.log('✅ Synced PNG icons to android/app/src/main/assets/public/icons/');
}

console.log('🎉 All PWA icons generated successfully!');
