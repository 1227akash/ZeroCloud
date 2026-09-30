# ZeroCloud (Zero-Store Peer-to-Peer File Transfer)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-RTCDataChannel-333333?logo=webrtc)](https://webrtc.org/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-success)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
[![CI](https://github.com/akash/zerocloud/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

> **Send up to 10 GB directly between devices. End-to-end encrypted. Zero cloud storage.**
> Built with Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, and WebRTC RTCDataChannel.
> Made by Akash.

---

## ⚡ Core Features

- **Direct Peer-to-Peer Transport:** Files stream directly from sender to receiver via WebRTC DTLS-encrypted `RTCDataChannel`.
- **Zero Server Uploads or Retention:** Files never touch disk, database, or cache on any server.
- **Client-Side AES-256-GCM Encryption:** Every 64 KB chunk is encrypted on the sender's device using a 256-bit symmetric key generated via Web Crypto.
- **RFC 3986 URL Hash Fragment Key:** The encryption key resides exclusively after the URL fragment (`#key=...`). Browsers never transmit hash fragments over HTTP or WebSockets, guaranteeing cryptographic blindness to all servers.
- **Mutual SAS Code Verification:** Both sender and receiver display a matching 6-digit Short Authentication String (SAS). Sender must explicitly click **"Approve this receiver"** before any data channel opens.
- **Single-Receiver Session Locking:** Once a receiver joins or is approved, the session locks exclusively to that device. Any unauthorized third party intercepting the link is rejected immediately (`SESSION_LOCKED`).
- **10 GB Large File Streaming:** 
  - Sender slices files in 64 KB chunks using `File.slice()`, avoiding RAM exhaustion.
  - WebRTC backpressure control with `bufferedAmountLowThreshold` (1 MB) to prevent browser buffer bloat.
  - Receiver streams directly to disk using the native **File System Access API** (`showSaveFilePicker`) with fallback to streaming downloads.
- **Incremental SHA-256 Integrity Verification:** Full cryptographic hash verified upon transfer completion.
- **Screen Wake Lock API:** Prevents mobile devices and laptops from sleeping during large transfers.
- **Minimalist Aesthetic & WCAG 2.2 AA:** Clean typography, dark/light theme toggle, contrast ratio >= 4.5:1, screen reader ARIA live announcements.
- **Privacy By Design:** Zero tracker loading without consent; privacy-first cookie consent banner (Accept / Reject / Customize).

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node v22.14 LTS)
- npm 9+

### Installation

```bash
git clone <repo-url> zerocloud
cd zerocloud
npm install
```

### Running Locally

```bash
# Starts both Next.js frontend and the WebSocket signaling service on port 3000
npm run dev

# Or in production mode:
npm run build
npm start
```

---

## 📦 How to Upload to GitHub Directly

### Method 1: Upload via GitHub Web UI (Zero CLI needed)
1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g. `zerocloud`). Leave "Add a README file" **unchecked**.
2. Click **"uploading an existing file"** in the "Quick setup" section.
3. Drag and drop all files from this project into the browser (the `.gitignore` ensures `node_modules` and `.next` are ignored, and you can also upload the provided `zerocloud-github-ready.zip`).
4. Enter commit message: `Initial commit: ZeroCloud production release` and click **Commit changes**.

### Method 2: Push via Git CLI
If you have Git installed on your terminal:
```bash
git init
git add .
git commit -m "Initial release: ZeroCloud end-to-end encrypted P2P transfer"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/zerocloud.git
git push -u origin main
```


Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Configuration is handled via `.env.local` (see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local server port | `3000` |
| `NEXT_PUBLIC_APP_URL` | Base application URL for canonical and OG tags | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | Signaling WebSocket URL (e.g., `wss://signaling.domain.com/ws`) | Auto-detects `ws://` or `wss://` on host |
| `NEXT_PUBLIC_STUN_SERVERS` | Comma-separated list of STUN servers | `stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302` |
| `NEXT_PUBLIC_TURN_SERVERS` | Comma-separated list of TURN servers (coturn) | `turn:turn.yourdomain.com:3478` (optional) |
| `NEXT_PUBLIC_TURN_USERNAME` | TURN authentication username | Short-lived or static username |
| `NEXT_PUBLIC_TURN_PASSWORD` | TURN authentication credential | Password/secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile anti-spam site key | Optional (honeypot built-in) |

---

## 🌐 Coturn (Self-Hosted TURN) Deployment

For environments behind strict corporate symmetric NATs or carrier-grade NATs (CGNAT), deploy a self-hosted `coturn` instance:

```bash
# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y coturn

# Edit /etc/turnserver.conf:
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_HIGH_ENTROPY_SECRET
realm=turn.yourdomain.com
total-quota=100
bps-capacity=0
stale-nonce
no-loopback-peers
no-multicast-peers

# Restart coturn
sudo systemctl restart coturn
```

TURN only relays encrypted DTLS packets; it cannot inspect file contents or decrypt transferred data.

---

## 🚢 Production Deployment

### Option A: Monolithic / VPS / Docker / Railway / Render
The bundled `server.js` serves both the Next.js App Router frontend and the WebSocket signaling server on a single port:

```bash
npm run build
NODE_ENV=production node server.js
```

### Option B: Vercel (Frontend) + Standalone Signaling Service
1. Deploy the Next.js repository directly to **Vercel**.
2. Deploy `server/signaling.js` as a lightweight Node.js worker on **Railway**, **Fly.io**, or an **AWS ECS / DigitalOcean Droplet**.
3. Set `NEXT_PUBLIC_WS_URL=wss://your-signaling-service.com/ws` in Vercel environment variables.

---

## 🧪 Testing

Run the automated 26-point production and security test suite:

```bash
npm test
```

Audits:
- Cryptographic chunk encryption, counter IV derivation, bit-flip tamper rejection, and out-of-order replay detection.
- Transfer scaling math for 1 KB, 100 MB, 5 GB, and 10 GB.
- Signaling session registration, SAS code generation, single-receiver lock, and session revocation.
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
- Broken link and DOM audit across all pages.
- Mandatory `"Made by Akash"` footer attribution check.

---

## 🛡️ License

MIT License. Designed and engineered by **Akash**.
