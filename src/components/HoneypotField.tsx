'use client';

import { useEffect, useRef } from 'react';

interface HoneypotFieldProps {
  onVerify?: (token: string) => void;
  trapValue: string;
  setTrapValue: (val: string) => void;
}

export default function HoneypotField({ onVerify, trapValue, setTrapValue }: HoneypotFieldProps) {
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return;

    const renderTurnstile = () => {
      if ((window as any).turnstile && turnstileContainerRef.current) {
        (window as any).turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            onVerify?.(token);
          },
        });
      }
    };

    if ((window as any).turnstile) {
      renderTurnstile();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderTurnstile;
      document.body.appendChild(script);
    }
  }, [siteKey, onVerify]);

  return (
    <>
      {/* Invisible Honeypot Trap for automated bots */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
          left: '-9999px',
          height: 0,
          width: 0,
          overflow: 'hidden',
        }}
      >
        <label htmlFor="_zc_company_trap">Leave this field blank</label>
        <input
          id="_zc_company_trap"
          name="_zc_company_trap"
          type="text"
          value={trapValue}
          onChange={(e) => setTrapValue(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Cloudflare Turnstile container if site key is configured */}
      {siteKey && (
        <div className="my-2 flex justify-center">
          <div ref={turnstileContainerRef} />
        </div>
      )}
    </>
  );
}
