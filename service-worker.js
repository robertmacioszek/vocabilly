self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('vocab-cache').then(cache => {
            return cache.addAll([
                '/index.html',
                '/manifest.json',
                '/app.js',
                '/style.css',
                '/icon-192x192.png',
                '/icon-512x512.png'
            ]);
        })
    );
});
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});