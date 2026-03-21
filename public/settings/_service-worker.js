self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.warn('🛠️ [Tombstone] Rogue Service Worker successfully uninstalled itself.');
      return self.registration.unregister();
    }).then(() => {
      // Force the page to reload once the ghost is dead
      self.clients.matchAll({ type: 'window' }).then(windowClients => {
        for (const windowClient of windowClients) {
          windowClient.navigate(windowClient.url);
        }
      });
    })
  );
});
