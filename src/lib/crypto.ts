// End-to-End Cryptography and Integrity Verification for ZeroCloud
// AES-256-GCM authenticated encryption for every chunk.
// Streaming incremental SHA-256 integrity verification (FIPS 180-4).
// Short Authentication String (SAS) derivation for peer verification.

export interface CryptoSession {
  key: CryptoKey;
  rawKeyBase64: string;
  salt: Uint8Array;
}

/**
 * Checks if the W3C Web Cryptography API is available in the current runtime context.
 * Modern browsers only expose window.crypto.subtle in Secure Contexts (HTTPS or localhost).
 */
export function isSecureCryptoAvailable(): boolean {
  if (typeof window === 'undefined') {
    return typeof crypto !== 'undefined' && !!crypto.subtle;
  }
  return !!window.crypto && !!window.crypto.subtle;
}

export function ensureSecureCrypto(): void {
  if (!isSecureCryptoAvailable()) {
    throw new Error(
      'ZeroCloud requires a Secure Context (HTTPS or localhost) for Web Crypto operations. Encryption is unavailable over insecure connections.'
    );
  }
}

/**
 * Generate a random 256-bit cryptographically strong session token
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a 6-character human-readable short code (e.g. ZC-8492)
 */
export function generateShortCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < bytes.length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `ZC-${code}`;
}

/**
 * Generates an AES-256-GCM symmetric key and salt for the transfer
 */
export async function generateSessionKey(): Promise<CryptoSession> {
  ensureSecureCrypto();

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const rawKeyBase64 = bufferToBase64Url(new Uint8Array(rawKey));

  // 12-byte salt for IV uniqueness
  const salt = new Uint8Array(12);
  crypto.getRandomValues(salt);

  return { key, rawKeyBase64, salt };
}

/**
 * Imports an AES-256-GCM key from base64url string (from URL fragment)
 */
export async function importSessionKey(base64UrlKey: string): Promise<CryptoKey> {
  ensureSecureCrypto();

  const rawKey = base64UrlToBuffer(base64UrlKey);
  return await crypto.subtle.importKey(
    'raw',
    rawKey as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates deterministic, unique 96-bit (12-byte) IV per chunk:
 * 4 bytes from session salt + 8 bytes chunk index big-endian.
 * Prevents IV reuse and enforces order.
 */
export function deriveChunkIv(salt: Uint8Array, chunkIndex: number): Uint8Array {
  const iv = new Uint8Array(12);
  // first 4 bytes from salt
  iv.set(salt.slice(0, 4), 0);
  // remaining 8 bytes: 64-bit chunk index
  const view = new DataView(iv.buffer);
  view.setBigUint64(4, BigInt(chunkIndex), false);
  return iv;
}

/**
 * Encrypts a single file chunk with AES-256-GCM
 * Authenticates chunkIndex and totalChunks via additionalData (AAD)
 */
export async function encryptChunk(
  key: CryptoKey,
  chunk: ArrayBuffer,
  chunkIndex: number,
  totalChunks: number,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  ensureSecureCrypto();

  const iv = deriveChunkIv(salt, chunkIndex);

  // AAD: 8 bytes (chunkIndex uint32 + totalChunks uint32)
  const aad = new Uint8Array(8);
  const aadView = new DataView(aad.buffer);
  aadView.setUint32(0, chunkIndex, false);
  aadView.setUint32(4, totalChunks, false);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128, // 16 bytes auth tag
    },
    key,
    chunk
  );

  return ciphertext;
}

/**
 * Decrypts and authenticates a single file chunk with AES-256-GCM
 * Throws an error if any byte was tampered or replayed
 */
export async function decryptChunk(
  key: CryptoKey,
  ciphertext: ArrayBuffer,
  chunkIndex: number,
  totalChunks: number,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  ensureSecureCrypto();

  const iv = deriveChunkIv(salt, chunkIndex);

  const aad = new Uint8Array(8);
  const aadView = new DataView(aad.buffer);
  aadView.setUint32(0, chunkIndex, false);
  aadView.setUint32(4, totalChunks, false);

  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertext
  );
}

/**
 * Computes a human-readable 6-digit Short Authentication String (SAS)
 * Derived from the SHA-256 digest of session token + salt
 */
export async function deriveSasCode(sessionToken: string, salt: Uint8Array): Promise<string> {
  ensureSecureCrypto();

  const enc = new TextEncoder();
  const tokenBytes = enc.encode(sessionToken);
  const combined = new Uint8Array(tokenBytes.length + salt.length);
  combined.set(tokenBytes, 0);
  combined.set(salt, tokenBytes.length);

  const digest = await crypto.subtle.digest('SHA-256', combined as unknown as BufferSource);
  const view = new DataView(digest);
  const num1 = (view.getUint32(0) % 900) + 100;
  const num2 = (view.getUint32(4) % 900) + 100;
  return `${num1}-${num2}`;
}

/**
 * Streaming, Incremental SHA-256 Hasher (FIPS 180-4 compliant)
 * Operates chunk-by-chunk in O(1) memory, preventing browser out-of-memory
 * crashes during multi-gigabyte (up to 10 GB) file transfers.
 */
export class IncrementalSha256 {
  private h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private bytesHashed = 0n;
  private w = new Uint32Array(64);
  private k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  update(data: ArrayBuffer | Uint8Array | ArrayBufferView): this {
    let bytes: Uint8Array;
    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else {
      throw new Error('Unsupported data type for SHA-256 update');
    }

    let offset = 0;
    const len = bytes.length;
    this.bytesHashed += BigInt(len);

    if (this.bufferLength > 0) {
      const needed = 64 - this.bufferLength;
      if (len >= needed) {
        this.buffer.set(bytes.subarray(0, needed), this.bufferLength);
        this.processBlock(this.buffer, 0);
        offset += needed;
        this.bufferLength = 0;
      } else {
        this.buffer.set(bytes, this.bufferLength);
        this.bufferLength += len;
        return this;
      }
    }

    while (offset + 64 <= len) {
      this.processBlock(bytes, offset);
      offset += 64;
    }

    if (offset < len) {
      this.buffer.set(bytes.subarray(offset), 0);
      this.bufferLength = len - offset;
    }

    return this;
  }

  private processBlock(block: Uint8Array, offset: number): void {
    const w = this.w;
    const k = this.k;

    for (let i = 0; i < 16; i++) {
      const idx = offset + i * 4;
      w[i] =
        ((block[idx] << 24) |
          (block[idx + 1] << 16) |
          (block[idx + 2] << 8) |
          block[idx + 3]) >>>
        0;
    }

    for (let i = 16; i < 64; i++) {
      const s0 =
        (((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
          ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
          (w[i - 15] >>> 3)) >>>
        0;
      const s1 =
        (((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
          ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
          (w[i - 2] >>> 10)) >>>
        0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = this.h[0];
    let b = this.h[1];
    let c = this.h[2];
    let d = this.h[3];
    let e = this.h[4];
    let f = this.h[5];
    let g = this.h[6];
    let h = this.h[7];

    for (let i = 0; i < 64; i++) {
      const s1 =
        (((e >>> 6) | (e << 26)) ^
          ((e >>> 11) | (e << 21)) ^
          ((e >>> 25) | (e << 7))) >>>
        0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 =
        (((a >>> 2) | (a << 30)) ^
          ((a >>> 13) | (a << 19)) ^
          ((a >>> 22) | (a << 10))) >>>
        0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    this.h[0] = (this.h[0] + a) >>> 0;
    this.h[1] = (this.h[1] + b) >>> 0;
    this.h[2] = (this.h[2] + c) >>> 0;
    this.h[3] = (this.h[3] + d) >>> 0;
    this.h[4] = (this.h[4] + e) >>> 0;
    this.h[5] = (this.h[5] + f) >>> 0;
    this.h[6] = (this.h[6] + g) >>> 0;
    this.h[7] = (this.h[7] + h) >>> 0;
  }

  digest(): string {
    const totalBits = this.bytesHashed * 8n;
    this.buffer[this.bufferLength] = 0x80;
    this.bufferLength++;

    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength, 64);
      this.processBlock(this.buffer, 0);
      this.bufferLength = 0;
    }

    this.buffer.fill(0, this.bufferLength, 56);
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, 64);
    view.setBigUint64(56, totalBits, false);
    this.processBlock(this.buffer, 0);

    let hex = '';
    for (let i = 0; i < 8; i++) {
      hex += this.h[i].toString(16).padStart(8, '0');
    }
    return hex;
  }
}

/**
 * Helper to compute SHA-256 hash of an entire buffer or blob
 */
export async function computeSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  if (isSecureCryptoAvailable()) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as unknown as BufferSource);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const hasher = new IncrementalSha256();
  hasher.update(buffer);
  return hasher.digest();
}

// Base64Url converters
export function bufferToBase64Url(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): Uint8Array {
  if (!base64url || typeof base64url !== 'string') {
    throw new Error('Invalid key encoding: base64url string expected.');
  }

  let base64 = base64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    throw new Error('Failed to decode encryption key: malformed base64url data.');
  }
}
