# How to Deploy ZeroCloud for Free (100% Free Tier Guide)

ZeroCloud requires two components:
1. **The Web Application** (Next.js App Router, Tailwind CSS, static assets)
2. **The Signaling Service** (Persistent WebSocket server relaying SDP/ICE handshake messages)

Here are the two best zero-cost deployment options:

---

## 🌟 Option 1: Easiest All-In-One Free Deploy (Render.com)

Render provides a **free web service tier** that supports both Next.js and persistent WebSockets on the same domain with automatic HTTPS/WSS and zero configuration.

### Step-by-Step Instructions:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial ZeroCloud commit"
   git branch -M main
   # Create a repository on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/zerocloud.git
   git push -u origin main
   ```

2. **Sign up on Render:**
   - Go to [render.com](https://render.com) and log in with your GitHub account (no credit card required).

3. **Create a New Web Service:**
   - In the Render dashboard, click **"New +"** $\to$ **"Web Service"**.
   - Select your `zerocloud` repository.
   - Configure the following settings:
     - **Name:** `zerocloud` (or any name you prefer)
     - **Region:** Closest to you (e.g. Oregon, Frankfurt, Singapore)
     - **Runtime:** `Node`
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `node server.js`
     - **Instance Type:** `Free`
   - Under **Environment Variables**, add:
     - `NODE_ENV` = `production`

4. **Click "Deploy Web Service":**
   - Render will build the app and start `server.js`.
   - In ~2 minutes, your website will be live at `https://zerocloud-xxxx.onrender.com`.
   - WebSockets automatically work at `wss://zerocloud-xxxx.onrender.com/ws` with zero extra setup!

---

## ⚡ Option 2: Ultra-Fast Split Deploy (Vercel + Render/Koyeb)

If you want Vercel's global edge network for the fastest possible landing page load times:

1. **Deploy Frontend to Vercel (Free):**
   - Go to [vercel.com](https://vercel.com) and import your `zerocloud` GitHub repository.
   - Vercel automatically detects Next.js.
   - Click **Deploy**.

2. **Deploy Signaling Service to Render or Koyeb (Free):**
   - Create a second service pointing to your repo.
   - Set **Build Command:** `npm install`
   - Set **Start Command:** `node -e "const http=require('http'); const {SignalingService}=require('./server/signaling'); const s=http.createServer(); new SignalingService().init(s); s.listen(process.env.PORT||3001);"`
   - This gives you a dedicated free WebSocket URL: `wss://zerocloud-signaling.onrender.com/ws`.

3. **Link them in Vercel:**
   - In Vercel Project Settings $\to$ **Environment Variables**, add:
     - `NEXT_PUBLIC_WS_URL` = `wss://zerocloud-signaling.onrender.com/ws`
   - Redeploy the frontend.

---

## 🌐 Free STUN & TURN Servers (No Credit Card)

### 1. Free STUN (Already Configured)
ZeroCloud comes preconfigured with Google's public STUN servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

STUN is 100% free with unlimited bandwidth and handles 85–90% of all peer-to-peer transfers directly.

### 2. Free TURN Server (For Strict Corporate NATs)
For transfers across strict symmetric firewalls where direct P2P is blocked:
1. Go to [metered.ca/tools/openrelay](https://www.metered.ca/tools/openrelay) or [metered.ca](https://www.metered.ca).
2. Sign up for the free tier (gives **50 GB/month of free TURN bandwidth**, no credit card required).
3. In your deployment dashboard (Render or Vercel), add these environment variables:
   - `NEXT_PUBLIC_TURN_SERVERS` = `turn:openrelay.metered.ca:80`
   - `NEXT_PUBLIC_TURN_USERNAME` = `openrelayproject`
   - `NEXT_PUBLIC_TURN_PASSWORD` = `openrelayproject`

---

## 🔒 Free Custom Domain & HTTPS

1. Both Vercel and Render automatically issue **free SSL/TLS certificates** via Let's Encrypt for all custom domains.
2. In your domain registrar (Namecheap, Cloudflare, GoDaddy):
   - Add a `CNAME` record pointing your domain (e.g. `transfer.yourdomain.com`) to your Render or Vercel address.
