import { ShieldCheck, Lock, EyeOff, ServerOff } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'ZeroCloud Privacy Policy: zero file storage, zero logging, client-side encryption.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: September 2026 • Plain language commitment to zero surveillance.
        </p>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
          <ServerOff className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">No Server Storage</span>
            <span className="text-zinc-500 dark:text-zinc-400">Files stream peer-to-peer and never touch disk on our infrastructure.</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Zero Content Access</span>
            <span className="text-zinc-500 dark:text-zinc-400">Encryption keys stay in browser hash fragments and are never transmitted.</span>
          </div>
        </div>
      </div>

      <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-zinc-600 dark:text-zinc-300">
        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            1. Architecture & Zero-Knowledge Guarantee
          </h2>
          <p>
            ZeroCloud is intentionally designed as a zero-knowledge peer-to-peer file transfer system. Unlike cloud hosting providers (e.g. Google Drive, Dropbox, WeTransfer), ZeroCloud does not accept, process, store, or cache your files on any server.
          </p>
          <p>
            When you send a file, it is read in temporary binary slices in your local browser memory, encrypted with AES-256-GCM, and sent directly to the recipient over a WebRTC RTCDataChannel.
          </p>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            2. Encryption Keys & The URL Fragment
          </h2>
          <p>
            The 256-bit symmetric key that protects your file is generated in your browser using the W3C Web Cryptography API (<code className="font-mono text-xs">crypto.subtle</code>). This key is encoded exclusively after the hash symbol (<code className="font-mono text-xs">#key=...</code>) in the shareable transfer URL.
          </p>
          <p>
            According to standard Internet specifications (RFC 3986), web browsers never send URL hash fragments to web servers in HTTP requests or WebSocket connections. Consequently, ZeroCloud servers cannot decrypt or view your files, even if compelled.
          </p>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            3. Signaling Data & Transient Memory
          </h2>
          <p>
            To establish a WebRTC connection through firewalls and NATs, our lightweight signaling service relays metadata (Session Description Protocol offers/answers and ICE candidate addresses). This signaling data:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Never contains file contents, file chunks, or encryption keys.</li>
            <li>Exists purely in volatile RAM during the handshake and is purged when either peer disconnects.</li>
            <li>Is never saved to a database or permanent storage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            4. Network Security & IP Addresses
          </h2>
          <p>
            To prevent denial-of-service (DDoS) attacks and brute force connection attempts, our signaling server tracks transient request counts per IP in volatile memory for a rolling 60-second window. These rate limit tables are automatically wiped and are not cross-referenced with personal identities.
          </p>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            5. Cookies & Analytics
          </h2>
          <p>
            We use only essential local storage to remember your chosen visual theme and cookie preferences. Optional performance metrics are strictly opt-in, aggregated anonymously, and never track file names, file sizes, session tokens, or IP addresses.
          </p>
        </section>
      </div>
    </div>
  );
}
