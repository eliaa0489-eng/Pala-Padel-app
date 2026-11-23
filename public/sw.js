/**
 * PALA Hardened PWA Service Worker
 * - Caches ONLY static same-origin app shell assets (html, css, js, svg, manifest).
 * - NEVER caches /api/* routes, requests with Authorization headers, or URLs with query secrets.
 */

const CACHE_NAME = 'pala-shell-v1';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

const SENSITIVE_QUERY_KEYS = [
  'x-vercel-protection-bypass',
  'token',
  'key',
  'secret',
  'auth',
  'code',
];

function isSafeStaticRequest(request) {
  if (request.method !== 'GET') return false;
  if (request.headers.has('authorization')) return false;

  try {
    const url = new URL(request.url);

    // Strictly same-origin only
    if (url.origin !== self.location.origin) return false;

    // Never cache serverless API routes
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      return false;
    }

    // Never cache URLs containing bypass tokens or query secrets
    for (const param of SENSITIVE_QUERY_KEYS) {
      if (url.searchParams.has(param)) return false;
    }

    // Only allow static app shell paths/extensions
    const path = url.pathname;
    if (
      path === '/' ||
      path.endsWith('.html') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.svg') ||
      path.endsWith('.png') ||
      path.endsWith('.ico') ||
      path.endsWith('.woff2') ||
      path.endsWith('/manifest.json')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((staleKey) => caches.delete(staleKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!isSafeStaticRequest(request)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
