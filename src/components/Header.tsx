'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Moon, Sun, ArrowLeftRight } from 'lucide-react';

export default function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('zerocloud_theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('zerocloud_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-dark-bg/70 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-medium tracking-tight text-zinc-900 dark:text-zinc-50 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
          aria-label="ZeroCloud Home"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base leading-none tracking-tight">ZeroCloud</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">ZERO-STORE P2P</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
