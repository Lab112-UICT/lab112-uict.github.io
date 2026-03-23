// LAB 112 — Service Worker
// Caches all core pages and assets for offline use

const CACHE_NAME = 'lab112-v2';

const CORE_ASSETS = [
  '/HomePage.html',
  '/Courses.html',
  '/Notes.html',
  '/PDFs.html',
  '/Calendar.html',
  '/login.html',
  '/viewer.html',
  '/index.html',
  '/manifest.json',
  '/icons/bootstrap-icons.css',
  '/icons/fonts/bootstrap-icons.woff',
  '/icons/fonts/bootstrap-icons.woff2',
  '/icon-192.png',
  '/icon-512.png',
];

// INSTALL — cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE — delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH — serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never try to cache PDFs or external CDN resources
  const isExternal = !url.hostname.includes('github.io');
  const isPDF = url.pathname.endsWith('.pdf');

  if (isExternal || isPDF) {
    // Just fetch from network — no caching
    event.respondWith(fetch(event.request).catch(() => {
      // If network fails on a PDF, return a simple offline message
      if (isPDF) {
        return new Response(
          '<html><body style="background:#0a1628;color:#f5ede0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><h2 style="color:#f0a500;">You are offline</h2><p>PDFs require an internet connection.<br>Please connect and try again.</p><a href="/PDFs.html" style="color:#14b8a6;">← Back to PDF Library</a></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    }));
    return;
  }

  // For local assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        // Not in cache — fetch from network and cache it
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Network failed and not in cache — show offline page
            if (event.request.destination === 'document') {
              return caches.match('/HomePage.html');
            }
          });
      })
  );
});
