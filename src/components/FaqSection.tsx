'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck, HardDrive, Lock, Zap } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon?: any;
}

const faqs: FaqItem[] = [
  {
    question: 'Are my files ever uploaded to or stored on any server?',
    answer:
      'Never. ZeroCloud is strictly peer-to-peer (P2P). Your file streams directly from sender device memory to receiver storage via an encrypted WebRTC data channel. Our signaling service only brokers the initial connection handshake and never sees or touches file contents, names, or encryption keys.',
    icon: HardDrive,
  },
  {
    question: 'How does ZeroCloud handle files up to 10 GB without crashing the browser?',
    answer:
      'ZeroCloud slices the file into small 64 KB binary chunks using File.slice() rather than loading the whole file into RAM. It uses WebRTC backpressure (bufferedAmountLowThreshold) to pause reading when the transmission buffer is full, and receiver writes directly to disk using the native File System Access API.',
    icon: Zap,
  },
  {
    question: 'How does end-to-end encryption work, and where is the key stored?',
    answer:
      'A 256-bit AES-GCM symmetric key is generated on your device using Web Crypto API. The key is encoded strictly inside the URL hash fragment (#key=...), which web browsers never transmit over HTTP or WebSockets. Each chunk has an authenticated counter-based IV and integrity check.',
    icon: Lock,
  },
  {
    question: 'What is the Short Authentication String (SAS) code?',
    answer:
      'The SAS code is a 6-digit mutual verification code derived cryptographically from the peer handshake. Both devices display this code so the sender can verify the receiver in person or over a call before clicking "Approve this receiver".',
    icon: ShieldCheck,
  },
  {
    question: 'What happens if a second receiver tries to use the same token or link?',
    answer:
      'ZeroCloud enforces single-receiver locking. Once a receiver connects or is approved, the session is locked to that device. Any subsequent device trying to use the token is rejected immediately and cannot view file metadata.',
    icon: Lock,
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full py-16 sm:py-24 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Everything you need to know about ZeroCloud&apos;s zero-store architecture.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const Icon = faq.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl glass-card overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
