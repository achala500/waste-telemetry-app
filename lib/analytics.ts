/**
 * Omni Telemetry Google Analytics 4 (GA4) Engine
 * Follows Omni Master Directives: Type safety, production resilience, zero dropped events.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

/**
 * Initialize GA4 client-side tracking script
 */
export function initGA4(measurementId: string = GA_MEASUREMENT_ID): void {
  if (typeof window === 'undefined') return;
  if (!measurementId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA4] No NEXT_PUBLIC_GA_MEASUREMENT_ID configured. Analytics running in dev mock mode.');
    }
    return;
  }

  // Prevent duplicate script injection
  if (document.getElementById('ga4-script')) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

/**
 * Clean GA4 custom event tracking helper
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    } else {
      // In dev or offline mode, push to dataLayer or log safely
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(['event', eventName, params]);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GA4] Failed to dispatch event:', eventName, err);
    }
  }
}

/**
 * Helper: Track Page View
 */
export function trackPageView(url: string, title?: string): void {
  trackEvent('page_view', {
    page_location: url,
    page_title: title || (typeof document !== 'undefined' ? document.title : '')
  });
}

/**
 * Helper: Track Study Session
 */
export function trackStudySession(
  durationMinutes: number,
  subject: string,
  category: string = 'focus'
): void {
  trackEvent('study_session_completed', {
    duration_minutes: durationMinutes,
    subject,
    category
  });
}

/**
 * Helper: Track Past Paper Download
 */
export function trackPaperDownload(paperId: string, title: string, subject: string): void {
  trackEvent('paper_download', {
    paper_id: paperId,
    paper_title: title,
    subject
  });
}
