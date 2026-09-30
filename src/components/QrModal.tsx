'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrIcon, Smartphone, Link as LinkIcon } from 'lucide-react';

interface QrModalProps {
  shareUrl: string;
  shortCode: string;
}

export default function QrModal({ shareUrl, shortCode }: QrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!shareUrl) return;

    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [shareUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shortCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="w-full p-6 sm:p-8 rounded-2xl glass-card shadow-lg text-zinc-900 dark:text-zinc-100 animate-fade-in">
      <div className="text-center mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 inline-flex items-center gap-1.5">
          <QrIcon className="w-3.5 h-3.5" />
          <span>Session Ready</span>
        </span>
        <h3 className="mt-2.5 text-lg sm:text-xl font-bold tracking-tight">
          Scan QR Code or Share Transfer Link
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Open the link on the receiver device. Once they connect, you will see a verification code to approve.
        </p>
      </div>

      {/* QR Display */}
      <div className="flex flex-col items-center justify-center">
        <div className="p-4 rounded-2xl bg-white shadow-md border border-zinc-200 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan this QR code on the receiver device to start the encrypted transfer"
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl"
            />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 bg-zinc-100 rounded-xl animate-pulse" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Smartphone className="w-4 h-4" />
          <span>Scan using phone camera or browser</span>
        </div>
      </div>

      {/* Short Code & Share Actions */}
      <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
        {/* Short Code Card */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-400 block">Short Code</span>
            <span className="text-lg font-mono font-bold tracking-wider text-zinc-900 dark:text-zinc-100">
              {shortCode}
            </span>
          </div>

          <button
            onClick={copyCode}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Copy short code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Share Link Button */}
        <button
          onClick={copyLink}
          className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Copy direct encrypted transfer link"
        >
          {copiedLink ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
          <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Transfer Link'}</span>
        </button>
      </div>
    </div>
  );
}
