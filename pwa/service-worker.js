const CACHE = "mesh-editor-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./app/style.css",
  "./app/main.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/OBJLoader.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
