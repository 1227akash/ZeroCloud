const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure Node PNG generator
function createPng(width, height, r, g, b, a = 255) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw rounded gradient effect
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = Math.max(0.6, 1 - dist / (width * 0.7));

      rawData[pixelOffset] = Math.min(255, Math.floor(r * factor));
      rawData[pixelOffset + 1] = Math.min(255, Math.floor(g * factor));
      rawData[pixelOffset + 2] = Math.min(255, Math.floor(b * factor));
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32 implementation
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    return ~c >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Brand indigo: 99, 102, 241 (#6366f1)
console.log('Generating public assets...');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPng(192, 192, 99, 102, 241));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPng(512, 512, 99, 102, 241));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 99, 102, 241));
fs.writeFileSync(path.join(publicDir, 'og-image.png'), createPng(1200, 630, 30, 27, 75)); // Dark indigo banner

// Generate a valid ICO file containing 32x32 image
const png32 = createPng(32, 32, 99, 102, 241);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon type
icoHeader.writeUInt16LE(1, 4); // count = 1

const icoDirEntry = Buffer.alloc(16);
icoDirEntry[0] = 32; // width
icoDirEntry[1] = 32; // height
icoDirEntry[2] = 0;  // palette count
icoDirEntry[3] = 0;  // reserved
icoDirEntry.writeUInt16LE(1, 4);  // color planes
icoDirEntry.writeUInt16LE(32, 6); // bpp
icoDirEntry.writeUInt32LE(png32.length, 8); // image size
icoDirEntry.writeUInt32LE(22, 12); // image offset (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoDirEntry, png32]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoFile);

console.log('Public assets generated successfully: icon-192, icon-512, apple-touch-icon, og-image, favicon.ico');
