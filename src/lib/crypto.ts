// End-to-End Cryptography and Integrity Verification for ZeroCloud
// AES-256-GCM authenticated encryption for every chunk.
// SHA-256 incremental integrity verification.
// Short Authentication String (SAS) derivation for peer verification.

export interface CryptoSession {
  key: CryptoKey;
  rawKeyBase64: string;
  salt: Uint8Array;
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
 * Helper to compute SHA-256 hash of an entire buffer or blob
 */
export async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
