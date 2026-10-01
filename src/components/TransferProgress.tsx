'use client';

import { motion } from 'framer-motion';
import { TransferProgress as TransferProgressType } from '@/lib/types';
import { formatBytes, formatSpeed, formatDuration } from '@/lib/utils';
import {
  Pause,
  Play,
  XCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface TransferProgressProps {
  progress: TransferProgressType;
  isSender: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRevoke?: () => void;
}

export default function TransferProgress({
  progress,
  isSender,
  onPause,
  onResume,
  onCancel,
  onRevoke,
}: TransferProgressProps) {
  const {
    status,
    progressPercent,
    bytesTransferred,
    totalBytes,
    speedBytesPerSec,
    etaSeconds,
    error,
    fileMetadata,
    sasCode,
  } = progress;

  const isPaused = status === 'paused';
  const isVerifying = status === 'verifying';
  const isCompleted = status === 'completed';
  const isFailed = status === 'error' || status === 'revoked';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Transfer ${status}: ${Math.round(progressPercent)}% complete`}
      className="w-full p-6 sm:p-8 rounded-2xl glass-panel shadow-lg text-zinc-900 dark:text-zinc-100 transition-colors"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : isFailed
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : isPaused
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isFailed ? (
              <AlertCircle className="w-6 h-6" />
            ) : isSender ? (
              <ArrowUpCircle className="w-6 h-6" />
            ) : (
              <ArrowDownCircle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                {isSender ? 'Sending File' : 'Receiving File'}
              </span>
              {sasCode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  SAS: {sasCode}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base sm:text-lg truncate max-w-sm sm:max-w-md">
              {fileMetadata?.name || 'Encrypted Payload'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isCompleted && !isFailed && (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Resume transfer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Pause transfer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              {isSender && onRevoke ? (
                <button
                  onClick={onRevoke}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none"
                  aria-label="Revoke session"
                >
                  Revoke
                </button>
              ) : onCancel ? (
                <button
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none"
                  aria-label="Cancel transfer"
                >
                  Cancel
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4 mb-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {progressPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              ({formatBytes(bytesTransferred)} / {formatBytes(totalBytes)})
            </span>
          </div>

          <div className="text-right">
            <div className="text-xs sm:text-sm font-mono font-semibold text-zinc-800 dark:text-zinc-200">
              {isPaused ? 'Paused' : formatSpeed(speedBytesPerSec)}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              {isCompleted
                ? 'Finished'
                : isVerifying
                ? 'Verifying SHA-256...'
                : isPaused
                ? 'Waiting'
                : `${formatDuration(etaSeconds)} left`}
            </div>
          </div>
        </div>

        {/* Outer Bar */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative"
        >
          <motion.div
            className={`h-full rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : isFailed
                ? 'bg-red-500'
                : isPaused
                ? 'bg-amber-500'
                : 'bg-brand-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(1, progressPercent)}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
        </div>
      </div>

      {/* Verification / Status Alert */}
      {(status === 'transferring' || isPaused) && (
        <div className="mt-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span><strong>Keep tab open:</strong> Screen lock or switching apps on mobile may pause transfers.</span>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
            ⚡ Screen WakeLock Active
          </span>
        </div>
      )}

      {isVerifying && (
        <div className="mt-6 p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center gap-3 text-xs sm:text-sm animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Validating whole-file cryptographic SHA-256 integrity digest...</span>
        </div>
      )}

      {isCompleted && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Transfer complete! Cryptographic integrity SHA-256 hash verified.</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 font-bold">
            Zero Server Footprint
          </span>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2.5 text-xs sm:text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
