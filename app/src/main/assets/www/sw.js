/**
 * Arrow Escape - PWA Service Worker
 * Standard Cache-First offline strategy for instant performance.
 */

const CACHE_NAME = "arrow-escape-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles/style.css",
    "./scripts/utils.js",
    "./scripts/storage.js",
    "./scripts/settings.js",
    "./scripts/audio.js",
    "./scripts/particles.js",
    "./scripts/animation.js",
    "./scripts/solver.js",
    "./scripts/generator.js",
    "./scripts/levels.js",
    "./scripts/engine.js",
    "./scripts/ui.js",
    "./scripts/main.js"
];

// Install Event
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Fetch Event
self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
