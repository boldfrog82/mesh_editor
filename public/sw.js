const CACHE_VERSION = "v0";
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            if (response.ok && shouldCache(request)) {
              cache.put(request, clone);
            }
          });
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

function shouldCache(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }
  if (url.pathname.endsWith('.glb') || url.pathname.endsWith('.ktx2')) {
    return true;
  }
  if (url.pathname.endsWith('.js')) {
    return true;
  }
  return CORE_ASSETS.includes(`.${url.pathname}`) || url.pathname.startsWith('/textures/');
}
