const CACHE_NAME = 'civicfix-cache-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './offline.html',
  './assets/icon.svg',
  './js/config.js',
  './js/categories.js',
  './js/app.js',
  './js/db.js',
  './js/auth.js',
  './js/ai.js',
  './js/router.js',
  './js/pages/home.js',
  './js/pages/report.js',
  './js/pages/map.js',
  './js/pages/leaderboard.js',
  './js/pages/profile.js',
  './js/pages/dashboard.js',
  './js/pages/admin.js',
  './js/pages/public.js',
  './js/pages/splash.js',
  './js/pages/login.js',
  './js/pages/signup.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // API is always live
  // Network first for all requests; fall back to cache when offline
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic' || e.request.url.includes('google') || e.request.url.includes('googleapis')) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return null;
      })
  );
});

// Listen to push events
self.addEventListener('push', (e) => {
  let data = { title: 'CivicFix', body: 'New civic update!' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'assets/icon.svg',
    badge: 'assets/icon.svg',
    data: data.data || {}
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click action on push notifications
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const urlToOpen = e.notification.data.url || './index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
