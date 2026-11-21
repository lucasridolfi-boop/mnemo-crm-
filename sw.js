// Mnemo offline support: the app shell is served from the network when possible,
// from the cache when offline. AI, transcription and sync always go to the network.
const CACHE = 'mnemo-shell-v2';
const SHELL = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest'];
const LIBS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.pathname.startsWith('/.netlify/')) return;
  const same = u.origin === self.location.origin;
  if (!same && !LIBS.test(r.url)) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok && (same || res.type === 'cors' || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
