'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, HardDrive, RefreshCw } from 'lucide-react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const isSender = searchParams.get('sent') === '1';
  const isReceiver = searchParams.get('received') === '1';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 text-center">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-2xl glass-card shadow-xl animate-fade-in">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 shadow-sm shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isSender
            ? 'File Sent Successfully'
            : isReceiver
            ? 'File Received Successfully'
            : 'Transfer Complete'}
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          The file was streamed directly between your devices with end-to-end AES-256-GCM encryption.
          No bytes were cached, uploaded, or stored on any server.
        </p>

        {/* Verification badges */}
        <div className="my-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 text-left">
          <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Cryptographic SHA-256 integrity verified</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <HardDrive className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero cloud server retention</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <RefreshCw className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Session closed and single-use token invalidated</span>
          </div>
        </div>

        {/* Single primary action: Send another file */}
        <Link
          href="/send"
          className="w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span>Send another file</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-zinc-400">Loading transfer recap...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
