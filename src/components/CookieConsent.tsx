'use client';

import { useState, useEffect } from 'react';
import { CookiePreferences } from '@/lib/types';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'zerocloud_cookie_consent';

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    hasResponded: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } else {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }

    const handleOpenModal = () => {
      setIsCustomizeOpen(true);
    };

    window.addEventListener('open_cookie_modal', handleOpenModal);
    return () => window.removeEventListener('open_cookie_modal', handleOpenModal);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.warn('Could not save cookie preferences:', err);
    }
    setPreferences(prefs);
    setIsOpen(false);
    setIsCustomizeOpen(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: false,
      hasResponded: true,
    });
  };

  const handleRejectAll = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      hasResponded: true,
    });
  };

  const handleSaveCustom = () => {
    savePreferences({
      ...preferences,
      hasResponded: true,
    });
  };

  if (!isOpen && !isCustomizeOpen) return null;

  return (
    <>
      {/* Banner */}
      {isOpen && !isCustomizeOpen && (
        <div
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-5 rounded-2xl glass-panel shadow-xl text-zinc-900 dark:text-zinc-100 animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Privacy & Cookies</h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                ZeroCloud never logs or stores file data. We only use strictly necessary cookies to operate the site, and optional anonymous metrics to track performance.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Reject Non-Essential
                </button>
                <button
                  onClick={() => setIsCustomizeOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline underline-offset-2 transition-colors focus-visible:outline-none"
                >
                  Customize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {isCustomizeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg p-6 rounded-2xl glass-card shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between">
              <h2 id="cookie-modal-title" className="text-lg font-semibold">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="p-1 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Close preferences modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Customize how ZeroCloud uses cookies. Files and encryption keys are NEVER tracked or transmitted regardless of your choices.
            </p>

            <div className="mt-5 space-y-4">
              {/* Essential */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">Strictly Essential</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Required
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Needed for peer connection signaling, theme persistence, and security verification.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 rounded border-zinc-300 text-brand-600 cursor-not-allowed opacity-60"
                  aria-label="Essential cookies required"
                />
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">Anonymous Performance Metrics</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Privacy-friendly aggregated statistics to monitor service availability. Never records file names, sizes, or IP addresses.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  aria-label="Allow anonymous performance metrics"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
