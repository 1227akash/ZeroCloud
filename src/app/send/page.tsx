'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FileDropzone from '@/components/FileDropzone';
import QrModal from '@/components/QrModal';
import SasApprovalModal from '@/components/SasApprovalModal';
import TransferProgress from '@/components/TransferProgress';
import HoneypotField from '@/components/HoneypotField';
import { TransferSender } from '@/lib/transfer-sender';
import { TransferProgress as TransferProgressType, TransferStatus } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';
import { playCompletionSound, requestNotificationPermission, sendTransferNotification } from '@/lib/notifications';
import { downloadZip } from 'client-zip';
import { ShieldCheck, ArrowRight, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export default function SendPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sender, setSender] = useState<TransferSender | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('');
  const [sasCode, setSasCode] = useState<string>('');
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBundling, setIsBundling] = useState(false);

  // Honeypot spam trap
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

  const isInitializingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (sender) {
        sender.cancel();
      }
    };
  }, [sender]);

  const handleStartSession = async () => {
    if (selectedFiles.length === 0) return;

    // Check honeypot bot trap
    if (trapValue) {
      setErrorMessage('Bot submission detected.');
      return;
    }

    try {
      setErrorMessage(null);
      isInitializingRef.current = true;

      // Ask for notification permission early so user is alerted when transfer finishes
      requestNotificationPermission().catch(() => {});

      let fileToSend: File;

      if (selectedFiles.length === 1) {
        fileToSend = selectedFiles[0];
      } else {
        setIsBundling(true);
        setStatus('preparing');
        // Client-side streaming ZIP bundling
        const zipResponse = downloadZip(selectedFiles);
        const zipBlob = await zipResponse.blob();
        fileToSend = new File([zipBlob], 'zerocloud-bundle.zip', {
          type: 'application/zip',
          lastModified: Date.now(),
        });
        setIsBundling(false);
      }

      setStatus('preparing');
      const newSender = new TransferSender(fileToSend);
      setSender(newSender);

      newSender.onProgress((p) => {
        setProgressData(p);
        setStatus(p.status);
        if (p.status === 'completed') {
          playCompletionSound();
          sendTransferNotification(
            'ZeroCloud Transfer Completed!',
            `${fileToSend.name} was successfully received and verified with SHA-256.`
          );
          trackEvent('transfer_completed');
          setTimeout(() => {
            router.push('/thank-you?sent=1');
          }, 1800);
        }
      });

      newSender.onStatus((s, err) => {
        setStatus(s);
        if (err) setErrorMessage(err);
      });

      const sessionInfo = await newSender.initialize();
      setShareUrl(sessionInfo.shareUrl);
      setShortCode(sessionInfo.shortCode);
      setSasCode(sessionInfo.sasCode);
      trackEvent('transfer_started');
    } catch (err: any) {
      console.error('Session init error:', err);
      setErrorMessage(err.message || 'Failed to initialize encrypted transfer session.');
      setStatus('error');
    } finally {
      setIsBundling(false);
      isInitializingRef.current = false;
    }
  };

  const handleApproveReceiver = async () => {
    if (!sender) return;
    try {
      await sender.approveReceiver();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve receiver.');
    }
  };

  const handleRejectReceiver = () => {
    if (!sender) return;
    sender.rejectReceiver();
  };

  const handleRevokeSession = () => {
    if (!sender) return;
    sender.revokeSession();
    setSelectedFiles([]);
    setSender(null);
    setStatus('idle');
  };

  const handleReset = () => {
    if (sender) sender.cancel();
    setSelectedFiles([]);
    setSender(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Send Files Directly
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Choose single or multiple files up to 10 GB. Encrypted in your browser and transferred peer-to-peer.
        </p>
      </div>

      {/* Honeypot field */}
      <HoneypotField trapValue={trapValue} setTrapValue={setTrapValue} />

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start justify-between gap-3 text-sm animate-fade-in"
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

      {/* View States */}
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-6">
          <FileDropzone
            onFilesSelected={setSelectedFiles}
            selectedFiles={selectedFiles}
            onClear={() => setSelectedFiles([])}
            disabled={isBundling}
          />

          {selectedFiles.length > 0 && (
            <button
              onClick={handleStartSession}
              disabled={isBundling}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 animate-fade-in disabled:opacity-50"
            >
              {isBundling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Packaging Files into Stream...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    {selectedFiles.length > 1
                      ? `Initialize Encrypted Transfer (${selectedFiles.length} files)`
                      : 'Initialize Encrypted Transfer'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {status === 'waiting_for_receiver' && (
        <div className="flex flex-col items-center gap-6">
          <QrModal shareUrl={shareUrl} shortCode={shortCode} />

          <div className="flex items-center gap-3">
            <button
              onClick={handleRevokeSession}
              className="px-4 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all"
            >
              Cancel and Revoke Session
            </button>
          </div>
        </div>
      )}

      {/* SAS Peer Approval Modal */}
      {status === 'receiver_pending_approval' && (
        <SasApprovalModal
          sasCode={sasCode}
          isSender={true}
          onApprove={handleApproveReceiver}
          onReject={handleRejectReceiver}
        />
      )}

      {/* Active Transfer / Verification Progress */}
      {(status === 'transferring' || status === 'paused' || status === 'verifying' || status === 'completed') && (
        <div className="space-y-6">
          <TransferProgress
            progress={progressData}
            isSender={true}
            onPause={() => sender?.pause()}
            onResume={() => sender?.resume()}
            onRevoke={handleRevokeSession}
          />
        </div>
      )}

      {/* Cancelled or Revoked State */}
      {(status === 'revoked' || (status === 'error' && !sender)) && (
        <div className="p-8 text-center rounded-2xl glass-card">
          <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mb-4">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Session Ended</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            This transfer session has closed. You can select another file to start fresh.
          </p>
          <button
            onClick={handleReset}
            className="mt-6 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold active:scale-[0.98] transition-all"
          >
            Start New Transfer
          </button>
        </div>
      )}
    </div>
  );
}
