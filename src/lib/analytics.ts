// Privacy-Preserving Zero-Knowledge Analytics for ZeroCloud
// Strictly respects user cookie consent.
// NEVER tracks file names, sizes, hashes, tokens, or IP addresses.

export type AnalyticsEvent =
  | 'page_view'
  | 'transfer_started'
  | 'transfer_completed'
  | 'transfer_cancelled'
  | 'transfer_error';

export function getCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const consent = localStorage.getItem('zerocloud_cookie_consent');
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return Boolean(parsed.analytics);
  } catch {
    return false;
  }
}

export function trackEvent(event: AnalyticsEvent, metadata?: Record<string, string | number>) {
  if (!getCookieConsent()) return;

  // Sanitize any metadata to ensure zero sensitive info is passed
  const safeData: Record<string, string | number> = {
    event,
    timestamp: Date.now(),
  };

  if (metadata?.durationSeconds !== undefined) {
    safeData.durationSeconds = metadata.durationSeconds;
  }

  // If Plausible is loaded or GA4 consent is granted:
  if (typeof (window as any).plausible === 'function') {
    (window as any).plausible(event, { props: safeData });
  } else if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', event, safeData);
  } else {
    // Development console audit log
    if (process.env.NODE_ENV === 'development') {
      console.log('[Privacy Analytics Event]', safeData);
    }
  }
}
