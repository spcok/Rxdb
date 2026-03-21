const CACHE_NAME = 'koa-static-v4';
const COMPLIANCE_CACHE = 'compliance-data-cache';
const MEDIA_CACHE = 'koa-media-cache';
const COMPLIANCE_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline-media-fallback.svg'
];

const broadcast = new BroadcastChannel('koa-pwa-messages');

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 1. Cleanup old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, COMPLIANCE_CACHE, MEDIA_CACHE].includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 2. Prune 14-day compliance data
      pruneComplianceCaches(),
      // 3. Claim clients
      self.clients.claim()
    ])
  );
});

// Removed Background Sync listener

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function pruneComplianceCaches() {
  const cache = await caches.open(COMPLIANCE_CACHE);
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('Date');
      if (dateHeader) {
        const fetchDate = new Date(dateHeader).getTime();
        if (now - fetchDate > COMPLIANCE_MAX_AGE) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Bypass non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Rule 1: Strict Shield Bypass (Network Only)
  if (url.hostname.includes('supabase.co') && (
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/')
  )) {
    return; // Network Only
  }

  // Rule 2: SWR for Media (Supabase Storage)
  if (url.pathname.includes('/storage/v1/object/public/')) {
    event.respondWith(staleWhileRevalidate(event.request, MEDIA_CACHE));
    return;
  }

  // Rule 3: Targeted Vault Caching (Strictly /rest/v1/)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkFirstWithTimeout(event.request, COMPLIANCE_CACHE));
    return;
  }

  // Rule 4: SPA Routing Fallback (App Shell Pattern)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Rule 5: Dynamic Asset Caching (Vite Assets)
  const isStaticAsset = [
    '.js', '.css', '.woff2', '.svg', '.png', '.jpg', '.jpeg'
  ].some(ext => url.pathname.endsWith(ext));

  if (isStaticAsset || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

async function networkFirstWithTimeout(request, cacheName) {
  const timeoutPromise = new Promise((resolve) => 
    setTimeout(() => resolve(null), 5000)
  );

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise
    ]);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    // Network failed
  }

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  return new Response('Offline and no cached data available', { status: 503 });
}
