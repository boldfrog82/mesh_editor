codex/build-minimum-viable-pwa
const CACHE = "mesh-editor-v3";

const CACHE = "mesh-editor-v2";
Main
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
codex/build-minimum-viable-pwa
  "./app/style.css",
  "./app/main.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/OBJLoader.js"

  "./icon-192.svg",
  "./icon-512.svg"
Main
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
codex/build-minimum-viable-pwa
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))

      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
Main
    )
  );
});

self.addEventListener("fetch", (event) => {
<codex/build-minimum-viable-pwa
=
  if (event.request.method !== "GET") {
    return;
  }

>Main
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
codex/build-minimum-viable-pwa
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, cloned));
        return response;
      });


      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          const url = new URL(event.request.url);

          // Cache same-origin assets as well as CDN dependencies that allow caching.
          if (response.ok && (url.origin === location.origin || url.hostname.endsWith("jsdelivr.net"))) {
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }

          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
Main
    })
  );
});
