import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

/**
 * URL Secret Scrubbing:
 * If ?x-vercel-protection-bypass=... or similar token query parameters are present on boot,
 * immediately scrub them from the visible address bar after the browser sets the cookie.
 */
function scrubSensitiveQueryParamsOnBoot(): void {
  try {
    if (typeof window === 'undefined' || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    const sensitiveKeys = [
      'x-vercel-protection-bypass',
      'x-vercel-set-bypass-cookie',
      'token',
      'auth',
      'key',
      'secret',
    ];
    let hasSensitive = false;
    for (const k of sensitiveKeys) {
      if (params.has(k)) {
        params.delete(k);
        hasSensitive = true;
      }
    }
    if (hasSensitive) {
      const remainingQuery = params.toString();
      const cleanUrl =
        window.location.pathname +
        (remainingQuery ? `?${remainingQuery}` : '') +
        window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch {
    // Ignore history API restrictions in embedded contexts
  }
}

/**
 * Safe PWA Service Worker registration (static app shell only, never caches /api/*)
 */
function registerSafeServiceWorker(): void {
  if (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fallback if Service Worker is blocked by browser privacy mode
      });
    });
  }
}

scrubSensitiveQueryParamsOnBoot();
registerSafeServiceWorker();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
