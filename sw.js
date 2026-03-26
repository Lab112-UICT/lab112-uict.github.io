// LAB 112 — Service Worker
// ⚠️  IMPORTANT: Every time you update files on GitHub,
//     increment the version number below by 1.
//     e.g. lab112-v3 → lab112-v4
//     This forces all installed apps to download the latest version.

const CACHE_NAME = 'lab112-v18';

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
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ACTIVATE — delete old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // take control of all open tabs
      .then(() => {
        // Notify all open tabs that an update is available
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'UPDATE_AVAILABLE' });
          });
        });
      })
  );
});

// FETCH — network first for HTML pages, cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache PDFs or external CDN resources
  const isExternal = !url.hostname.includes('github.io') && !url.hostname.includes('localhost');
  const isPDF = url.pathname.endsWith('.pdf');

  if (isExternal || isPDF) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (isPDF) {
          return new Response(
            '<html><body style="background:#0a1628;color:#f5ede0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><h2 style="color:#f0a500;">You are offline</h2><p>PDFs require an internet connection.<br>Please connect and try again.</p><a href="/PDFs.html" style="color:#14b8a6;margin-top:1rem;display:inline-block;">← Back to PDF Library</a></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })
    );
    return;
  }

  // For HTML pages — network first so updates always show
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Network failed — serve from cache
          return caches.match(event.request)
            .then(cached => cached || caches.match('/HomePage.html'));
        })
    );
    return;
  }

  // For all other assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match('/HomePage.html'));
      })
  );
});
