import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export const metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-20 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl glass-card shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6">
          <Compass className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Page Not Found
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          The requested page does not exist or this transfer link has expired.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="w-full py-3 px-6 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-brand-600 dark:hover:bg-brand-500 dark:hover:text-white font-semibold text-xs sm:text-sm tracking-tight inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
