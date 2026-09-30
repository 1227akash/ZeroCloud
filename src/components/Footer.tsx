'use client';

import Link from 'next/link';

interface FooterProps {
  onOpenCookies?: () => void;
}

export default function Footer({ onOpenCookies }: FooterProps) {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-dark-bg/50 py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ZeroCloud</span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Direct Peer-to-Peer encrypted transfers up to 10 GB. Zero server storage.
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-600 dark:text-zinc-400">
            <Link
              href="/privacy"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/#security"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Security Architecture
            </Link>
            <button
              type="button"
              onClick={() => {
                if (onOpenCookies) {
                  onOpenCookies();
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open_cookie_modal'));
                }
              }}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Cookie Settings
            </button>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} ZeroCloud. Zero cloud retention by cryptographic design.</p>
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            Made by Akash
          </p>
        </div>
      </div>
    </footer>
  );
}
