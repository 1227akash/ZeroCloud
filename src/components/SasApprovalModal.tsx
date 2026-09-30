'use client';

import { ShieldAlert, Check, X } from 'lucide-react';

interface SasApprovalModalProps {
  sasCode: string;
  isSender: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export default function SasApprovalModal({
  sasCode,
  isSender,
  onApprove,
  onReject,
}: SasApprovalModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sas-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl glass-card shadow-2xl text-zinc-900 dark:text-zinc-100 text-center">
        <div className="w-14 h-14 mx-auto rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 id="sas-modal-title" className="text-xl font-bold tracking-tight">
          Verify Receiver Device
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {isSender
            ? 'A receiver device has connected. Compare the 6-digit verification code below with their screen before approving data transmission.'
            : "Connecting to sender. Please confirm this 6-digit verification code matches the sender's screen while they approve."}
        </p>

        {/* Verification Code Box */}
        <div className="my-6 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 block mb-1">
            Short Authentication String (SAS)
          </span>
          <span className="text-3xl sm:text-4xl font-mono font-bold tracking-wider text-brand-600 dark:text-brand-400 select-all">
            {sasCode || '--- - ---'}
          </span>
        </div>

        {isSender ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onReject}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="w-4 h-4" />
              <span>Reject Peer</span>
            </button>
            <button
              onClick={onApprove}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Check className="w-4 h-4" />
              <span>Approve This Receiver</span>
            </button>
          </div>
        ) : (
          <div className="py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>Waiting for sender to click "Approve this receiver"...</span>
          </div>
        )}
      </div>
    </div>
  );
}
