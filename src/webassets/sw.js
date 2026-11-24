// Offline support: cache the app shell, plus the last tides, weather, map code and map tiles you looked at,
// so the forecast still works out on the water with no signal. Live data always tries the network first.
const CACHE = 'fishforecast-v11', DATA = 'fishforecast-data-v1', TILES = 'fishforecast-tiles-v1';
const DATA_HOSTS = ['api.open-meteo.com', 'marine-api.open-meteo.com', 'unpkg.com', 'api.weather.gov'];
const TILE_HOSTS = ['basemap.nationalmap.gov'];
const isData = u => DATA_HOSTS.includes(u.hostname) || (u.hostname.endsWith('.supabase.co') && u.pathname.includes('/functions/v1/noaa-tides'));
async function trim(name, max) { const c = await caches.open(name), ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![CACHE, DATA, TILES].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    if (TILE_HOSTS.includes(url.hostname)) { // tiles: cache first, keep the most recent 1500
      e.respondWith(caches.open(TILES).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { c.put(e.request, r.clone()); trim(TILES, 1500); } return r; }))));
    } else if (isData(url)) { // tides, weather, map code: network first, saved copy when offline
      e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(DATA).then(c => { c.put(e.request, copy); trim(DATA, 400); }); } return r; })
        .catch(() => caches.open(DATA).then(c => c.match(e.request)).then(r => r || Response.error())));
    }
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
// Bite alerts: show pushed notifications and open the app when tapped.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Fish Bite Forecast', { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', tag: d.tag, data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.startsWith(self.registration.scope)) { w.navigate(url).catch(() => { }); return w.focus(); }
    return clients.openWindow(url);
  }));
});
