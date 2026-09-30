# ZeroCloud Architecture & Security Model

> **Author:** Akash  
> **Classification:** Production Security Architecture Specification  
> **System:** ZeroCloud Peer-to-Peer Transfer Engine  

---

## 1. High-Level Architecture Overview

ZeroCloud is architected to eliminate third-party trust and central data storage during large-scale file transfers (up to 10 GB). 

Traditional cloud transfer platforms function via a store-and-forward proxy model (uploading customer files to cloud object storage like S3, generating database records, and providing a download link). In contrast, ZeroCloud utilizes **direct peer-to-peer data pipes** powered by WebRTC RTCDataChannels, with an out-of-band signaling broker and client-side authenticated symmetric encryption.

```
                    ┌────────────────────────────┐
                    │     Signaling Service      │
                    │   (Ephemeral WebSocket)    │
                    │ Relays ONLY SDP/ICE frames │
                    └──────▲──────────────▲──────┘
                           │              │
                   SDP/ICE │              │ SDP/ICE
                           │              │
               ┌───────────┴───┐      ┌───┴───────────┐
               │    SENDER     │      │   RECEIVER    │
               │ (Client Web)  │      │ (Client Web)  │
               └───────▲───────┘      └───────▲───────┘
                       │                      │
                       └──────────────────────┘
                          DIRECT P2P WEBRTC
                       DTLS-SRTP RTCDataChannel
                       AES-256-GCM Sliced Stream
                       (Zero Server Storage)
```

---

## 2. Threat Model: What The Server Can and Cannot See

### 2.1 What The Signaling Server & Network Path CANNOT See
| Data Element | Server Visibility | Cryptographic / Architectural Guarantee |
|---|---|---|
| **File Contents** | ❌ **Completely Blind (0%)** | Bytes stream exclusively across peer WebRTC data channels. File data is never forwarded to the signaling server. |
| **File Encryption Key** | ❌ **Completely Blind (0%)** | Key is generated client-side via Web Crypto and placed in the URL hash fragment (`#key=...`). Browsers never send hash fragments to servers (RFC 3986). |
| **File Name & Metadata** | ❌ **Completely Blind (0%)** | File metadata is only sent inside the encrypted WebRTC data channel after peer approval. Signaling messages only carry session tokens. |
| **File Size & Type** | ❌ **Completely Blind (0%)** | Transmitted solely over the established data channel. The signaling broker has zero knowledge of file size or MIME type. |
| **File Cryptographic Digest** | ❌ **Completely Blind (0%)** | SHA-256 hash is computed locally and exchanged peer-to-peer at the end of transfer for verification. |

### 2.2 What The Signaling Server CAN See
| Data Element | Server Purpose | Retention Period |
|---|---|---|
| **Session ID Token** | 256-bit random hex string used to pair sender and receiver. | Ephemeral RAM only; purged immediately when either peer disconnects or after 24h idle. |
| **Short Code** | 6-character human-readable lookup string (e.g. `ZC-8492`). | Ephemeral RAM only; purged upon session closure. |
| **WebRTC SDP Offer / Answer** | Session Description Protocol strings describing peer audio/video/data codecs and DTLS fingerprints. | Relayed in transit and immediately discarded. Never written to disk. |
| **ICE Candidates** | Network endpoints (IP addresses and STUN/TURN reflexive ports) necessary for NAT traversal. | Relayed in transit and immediately discarded. |
| **Peer Connection State** | Connected / disconnected status to trigger cleanup and prevent duplicate receivers. | Maintained in memory while socket is open. |
| **Transient Client IP** | Used strictly for in-memory rate limiting (max 40 connections/min). | Purged after a rolling 60-second window. |

---

## 3. Cryptographic Design Specification

### 3.1 Key Generation & Transport
1. Sender generates an AES-256-GCM symmetric key using:
   ```ts
   const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
   ```
2. The raw key is exported and encoded into standard base64url string.
3. The base64url string is placed solely into the URL hash fragment:
   `https://zerocloud.app/receive?session={sessionId}#key={rawKeyBase64}`
4. The receiver browser parses `window.location.hash`, imports the key, and immediately initializes local decryption.

### 3.2 Slicing, Authenticated Encryption & Anti-Replay
- **Chunk Size:** 64 KB (`65,536` bytes).
- **Session Salt:** 12 bytes generated cryptographically on the sender.
- **Counter-Based 96-bit IV:**
  - Bytes 0..3: 4 bytes from session salt.
  - Bytes 4..11: 8 bytes representing 64-bit chunk index (`BigInt(chunkIndex)` encoded big-endian).
  - *Guarantee:* Because every chunk index is strictly incremented, IV reuse is mathematically impossible.
- **Additional Authenticated Data (AAD):**
  - Binary header containing:
    - 4 bytes: `chunkIndex` (uint32)
    - 4 bytes: `totalChunks` (uint32)
  - *Guarantee:* Prevents ciphertext tampering, slice reordering, slice duplication, and truncation attacks.

### 3.3 Short Authentication String (SAS) Derivation
To prevent man-in-the-middle (MITM) attacks during signaling or link interception:
$$\text{SAS} = \text{Truncate}_{6\text{-digits}}\Big(\text{SHA-256}(\text{SessionID} \mathbin{\Vert} \text{Salt})\Big)$$
Both peers compute and display this code. The sender must inspect and click **"Approve this receiver"** before any file data or metadata channel is initialized.

---

## 4. 10 GB Large File Streaming & Memory Isolation

To handle transfers up to 10 GB on low-spec mobile and desktop hardware without memory overflow:

1. **Sender Memory Isolation:**
   - Uses `file.slice(offset, offset + 64KB)` to read only a single 64 KB slice into RAM at any given millisecond.
   - Slices are encrypted and dispatched immediately.
2. **Backpressure Flow Control:**
   - WebRTC `RTCDataChannel.bufferedAmountLowThreshold` is set to 1 MB (`1,048,576` bytes).
   - If `dc.bufferedAmount > BUFFER_THRESHOLD`, the sender loop halts reading and awaits the `bufferedamountlow` event before reading the subsequent slice.
3. **Receiver Direct Disk Streaming:**
   - Employs the **W3C File System Access API** (`showSaveFilePicker()` -> `createWritable()`).
   - Decrypted chunks are streamed directly to the local filesystem without buffering in browser heap.
   - Fallback for non-supporting browsers (iOS Safari): streaming Blob accumulator with memory-friendly chunk management.
4. **Whole-File Integrity Guarantee:**
   - Sender and receiver compute incremental SHA-256 hashes.
   - Upon completion, the sender sends `{ type: 'transfer_complete', sha256: computedHash }`.
   - Receiver verifies the final hash matches to the bit before releasing the file to the user.

---

## 5. Session Security & Receiver Locking

1. **Single-Use Token:**
   - Once a receiver connects and is approved, the session state transitions to `isApproved = true`.
   - If a second device attempts to use the same session token or short code, the signaling service rejects it with:
     ```json
     { "type": "error", "code": "SESSION_LOCKED", "message": "This session is locked to another receiver. Only one receiver is permitted." }
     ```
2. **Instant Revocation:**
   - The sender can click **"Revoke Session"** at any moment.
   - Signaling immediately sends `session_revoked` to the receiver, tears down the socket, and purges all references from RAM.
3. **No Auto-Expiry / Tab-Bound Lifecycle:**
   - Sessions do not have arbitrary countdown timers. The session remains valid as long as the sender's tab is open and closes cleanly when finished.

---

## 6. Infrastructure & Deployment Hardening

### 6.1 Security Headers
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Content-Security-Policy`: Disallows untrusted scripts, restricts frames, forces HTTPS upgrade.

### 6.2 Anti-Spam & Abuse Protection
- Hidden honeypot form field (`_zc_company_trap`) to detect and discard automated bot submissions.
- Optional Cloudflare Turnstile integration.
- IP rate limiting on signaling WebSocket upgrades (max 40 upgrades/min).
- Per-socket rate limiting (max 120 messages/min).
- Maximum message size enforcement (64 KB ceiling on signaling payloads).

---

## 7. Compliance & Privacy Summary

- **Zero Content Logging:** Zero bytes of files, keys, or hashes logged.
- **Zero Third-Party Trackers:** Default state loads zero analytics. Opt-in performance analytics strictly respects cookie consent choices.
- **Legal Alignment:** Plain-language Privacy Policy and Terms & Conditions accurately describe the zero-store, direct P2P architecture.
- **Attribution:** "Made by Akash" present in the footer of every page.
