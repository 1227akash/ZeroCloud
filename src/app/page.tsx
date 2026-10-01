import Link from 'next/link';
import { ArrowRight, ShieldCheck, HardDrive, Key, Lock, EyeOff, CheckCircle2, Cpu } from 'lucide-react';
import FaqSection from '@/components/FaqSection';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        {/* Single Trust Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Zero Server Storage • Direct P2P Encryption</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.08] max-w-4xl mx-auto">
          Send up to <span className="text-brand-600 dark:text-brand-400">10 GB</span> directly.
          <br className="hidden sm:inline" /> Zero cloud in the middle.
        </h1>

        {/* Subtitle - strictly <= 20 words */}
        <p className="mt-5 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-normal leading-relaxed">
          Stream heavy files browser-to-browser with AES-256-GCM encryption. Zero cloud storage, zero tracking, and no accounts required.
        </p>

        {/* Single Primary CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/send"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base tracking-tight flex items-center justify-center gap-2.5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>Send a file</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Editorial Visual Asset */}
        <div className="mt-12 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-950 shadow-2xl relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/p2p_stream.jpg"
            alt="Direct browser-to-browser encrypted WebRTC data stream visualization"
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.01]"
            loading="eager"
          />
          <div className="absolute inset-x-0 bottom-0 py-3 px-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between text-xs text-zinc-300 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Direct WebRTC RTCDataChannel
            </span>
            <span className="hidden sm:inline text-zinc-400">Memory-to-Disk Stream</span>
          </div>
        </div>

        {/* Minimal Feature Row */}
        <div className="mt-10 pt-8 border-t border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Up to 10 GB</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Direct WebRTC P2P</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">AES-256-GCM E2EE</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Zero Server Storage</span>
          </div>
        </div>
      </section>

      {/* Asymmetric Technical Architecture Section */}
      <section id="how-it-works" className="w-full py-20 bg-zinc-100/50 dark:bg-zinc-950/40 border-y border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              How ZeroCloud Works
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              A browser-native pipeline engineered to move data without servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: In-Memory Keying */}
            <div className="p-7 rounded-2xl glass-card flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-mono font-bold text-sm mb-5">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                  Client Key Generation
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  A random 256-bit symmetric key is generated inside Web Crypto memory. The key lives solely in the URL hash fragment (#key), isolated from HTTP requests and signaling servers.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                Key never crosses wire
              </div>
            </div>

            {/* Step 2: SAS Verification */}
            <div className="p-7 rounded-2xl glass-card flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-mono font-bold text-sm mb-5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                  Mutual SAS Verification
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  When the receiver connects, both devices compute a matching 6-digit verification code. The sender manually approves the peer, locking the session to prevent unauthorized interception.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                Single-receiver lock
              </div>
            </div>

            {/* Step 3: Stream Slicing */}
            <div className="p-7 rounded-2xl glass-card flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-mono font-bold text-sm mb-5">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                  Backpressured Streaming
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Files are sliced into 64 KB encrypted chunks. WebRTC data channel backpressure regulates buffer pressure, streaming directly into the receiver disk with zero RAM overflow.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                Direct-to-disk write
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture Bento Grid */}
      <section id="security" className="w-full py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Engineered for Absolute Confidentiality
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Mathematical and architectural guarantees that conventional cloud storage providers cannot match.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Key Never Leaves The Browser
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The encryption key is embedded only in the URL hash fragment (<code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-xs">#key=...</code>). By RFC 3986 specification, web browsers never include hash fragments in HTTP requests or WebSocket handshakes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Signaling server is cryptographically blind to keys</span>
            </div>
          </div>

          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Zero Cloud Storage
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Conventional cloud transfer services upload your file to Amazon S3 or Google Cloud first, storing it for hours or days. ZeroCloud transfers bytes directly across peer-to-peer WebRTC sockets with zero server disk touches.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero data retained or cached anywhere</span>
            </div>
          </div>

          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Receiver Lock and Single-Use Tokens
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Once a receiver connects and is approved, the session locks exclusively to that device. Any unauthorized third party intercepting the link is rejected immediately.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Anti-eavesdropping and token reuse prevention</span>
            </div>
          </div>

          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Chunk Authentication and Anti-Replay
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Each 64 KB slice is authenticated with AES-GCM and signed with a unique counter IV and chunk index. Even in case of packet tampering or replay, the receiver detects and drops corrupted slices.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>SHA-256 verified integrity guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection />
    </div>
  );
}

