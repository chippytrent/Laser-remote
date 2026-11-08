// LaserRemote offline cache
const CACHE = 'laserremote-v4';
const FILES = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates arrive), but give up after 2.5 s and use the saved copy
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNet = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(r => setTimeout(r, 2500, null));
    try {
      const res = await Promise.race([fromNet, timeout]);
      if (res) return res;
    } catch (_) {}
    const cached = await cache.match(req, {ignoreSearch: true}) ||
                   (req.mode === 'navigate' && await cache.match('./index.html'));
    if (cached) return cached;
    return fromNet; // nothing saved yet — wait for the network
  })());
});
