'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TransferReceiver } from '@/lib/transfer-receiver';
import { TransferProgress as TransferProgressType, TransferStatus } from '@/lib/types';
import TransferProgress from '@/components/TransferProgress';
import SasApprovalModal from '@/components/SasApprovalModal';
import HoneypotField from '@/components/HoneypotField';
import { trackEvent } from '@/lib/analytics';
import {
  DownloadCloud,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { playCompletionSound, requestNotificationPermission, sendTransferNotification } from '@/lib/notifications';

function ReceiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inputCode, setInputCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [receiver, setReceiver] = useState<TransferReceiver | null>(null);
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [sasCode, setSasCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trapValue, setTrapValue] = useState('');

  const [progressData, setProgressData] = useState<TransferProgressType>({
    status: 'idle',
    progressPercent: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    currentChunk: 0,
    totalChunks: 0,
  });

  const startReceiving = async (targetSession: string, targetKey: string) => {
    if (trapValue) {
      setErrorMessage('Bot submission detected.');
      return;
    }

    try {
      setErrorMessage(null);
      setStatus('connecting');

      const isShortCode = targetSession.startsWith('ZC-') || targetSession.length <= 8;
      const newReceiver = new TransferReceiver(
        isShortCode ? '' : targetSession,
        targetKey,
        isShortCode ? targetSession : undefined
      );

      setReceiver(newReceiver);

      newReceiver.onProgress((p) => {
        setProgressData(p);
        setStatus(p.status);
        if (p.sasCode) setSasCode(p.sasCode);

        if (p.status === 'completed') {
          playCompletionSound();
          sendTransferNotification(
            'ZeroCloud File Received!',
            `${p.fileMetadata?.name || 'File'} was downloaded and cryptographically verified.`
          );
          trackEvent('transfer_completed');
          setTimeout(() => {
            router.push('/thank-you?received=1');
          }, 1800);
        }
      });

      newReceiver.onStatus((s, err) => {
        setStatus(s);
        if (err) setErrorMessage(err);
      });

      requestNotificationPermission().catch(() => {});
      await newReceiver.initialize();
      trackEvent('transfer_started');
    } catch (err: any) {
      console.error('Receiver connection error:', err);
      setErrorMessage(err.message || 'Failed to connect to transfer session.');
      setStatus('error');
    }
  };

  // Extract session ID and key fragment on load
  useEffect(() => {
    const sessionFromQuery = searchParams.get('session');
    let keyFromHash = '';

    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/#key=([^&]+)/);
      if (match) {
        try {
          keyFromHash = decodeURIComponent(match[1]);
        } catch (_) {
          keyFromHash = match[1];
        }
      }
    }

    if (sessionFromQuery && keyFromHash) {
      startReceiving(sessionFromQuery, keyFromHash);
    } else if (sessionFromQuery) {
      setInputCode(sessionFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (receiver) {
        receiver.cancel();
      }
    };
  }, [receiver]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    let code = inputCode.trim();
    let key = manualKey.trim();

    // Smart link detection: if full URL was pasted into the code box
    if (code.includes('://') || code.includes('/receive?')) {
      try {
        const parsed = new URL(code, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        const sessionParam = parsed.searchParams.get('session');
        if (sessionParam) code = sessionParam;
        if (!key && parsed.hash) {
          const match = parsed.hash.match(/#key=([^&]+)/);
          if (match) {
            try {
              key = decodeURIComponent(match[1]);
            } catch (_) {
              key = match[1];
            }
          }
        }
      } catch (_) {}
    }

    if (!key && typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/#key=([^&]+)/);
      if (match) {
        try {
          key = decodeURIComponent(match[1]);
        } catch (_) {
          key = match[1];
        }
      }
    }

    startReceiving(code, key);
  };

  const handleReset = () => {
    if (receiver) receiver.cancel();
    setReceiver(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Receive a Direct File
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Connected directly to the sender&apos;s device. Data streams slice-by-slice into your local storage.
        </p>
      </div>

      <HoneypotField trapValue={trapValue} setTrapValue={setTrapValue} />

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start justify-between gap-3 text-sm animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Manual Code Entry Form */}
      {status === 'idle' && (
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl glass-card animate-fade-in">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="session-code"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Enter Short Code or Session Token
              </label>
              <input
                id="session-code"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. ZC-8920 or token"
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 font-mono text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="session-key"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Decryption Key (if not in URL)
              </label>
              <input
                id="session-key"
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Base64 URL Key (optional if using link)"
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 font-mono text-xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Connect and Receive File</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Awaiting Sender Approval (SAS check) */}
      {status === 'receiver_pending_approval' && (
        <SasApprovalModal
          sasCode={sasCode}
          isSender={false}
          onApprove={() => {}}
          onReject={() => handleReset()}
        />
      )}

      {/* Connecting WebRTC */}
      {(status === 'connecting' || status === 'approved') && (
        <div className="max-w-md mx-auto p-8 rounded-2xl glass-card text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Establishing Peer Connection
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Securing DTLS handshake and setting up direct data channel...
          </p>
        </div>
      )}

      {/* Transfer in Progress */}
      {(status === 'transferring' || status === 'paused' || status === 'verifying' || status === 'completed') && (
        <TransferProgress
          progress={progressData}
          isSender={false}
          onCancel={handleReset}
        />
      )}

      {/* Error or Revoked State */}
      {(status === 'revoked' || status === 'error') && (
        <div className="max-w-md mx-auto p-8 text-center rounded-2xl glass-card">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Connection Failed</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {errorMessage || 'The session is unavailable, locked to another device, or has been revoked.'}
          </p>
          <button
            onClick={handleReset}
            className="mt-6 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold active:scale-[0.98] transition-all"
          >
            Try Another Code
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-zinc-400">Loading transfer session...</div>}>
      <ReceiveContent />
    </Suspense>
  );
}
