/* Mori PWA service worker.
   Навігація (index.html) — network-first: після деплою користувач одразу
   отримує НОВУ версію, коли онлайн; офлайн — падає в кеш.
   Асети (іконки) — cache-first.
   Якщо змінив іконки/асети — підніми CACHE_VERSION. */
const CACHE_VERSION = 'mori-v1';
const CACHE = 'mori-' + CACHE_VERSION;
const CORE = ['./', './index.html', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Навігація: спочатку мережа (свіжа версія), офлайн — кеш
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', cp));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Асети: спочатку кеш, інакше мережа + покласти в кеш
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        try {
          if (res.ok && new URL(e.request.url).origin === self.location.origin) {
            const cp = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, cp));
          }
        } catch (err) {}
        return res;
      })
    )
  );
});
