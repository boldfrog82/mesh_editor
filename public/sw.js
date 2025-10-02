const CACHE_VERSION = 'mesh-editor-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  '../app/main.js',
  '../app/main.css',
  '../app/bootstrap.js',
  '../app/routes.js',
  '../app/state.js',
  '../ui/layout.js',
  '../ui/panels.js',
  '../ui/toolbar.js',
  '../ui/status.js',
  '../ui/project-picker.js',
  '../ui/primer.js',
  '../engine/runtime.js',
  '../engine/mesh.js',
  '../engine/uv.js',
  '../engine/paint.js',
  '../engine/modifiers.js',
  '../io/glb.js',
  '../io/ktx2.js',
  '../storage/opfs.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }
  if (url.href.includes('babylonjs.com') || url.href.includes('meshoptimizer')) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});
