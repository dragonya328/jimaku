// オフライン用 Service Worker：アプリ本体と全公演の台本を端末に保存する
const CACHE = 'usub-v8';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './shows/shows.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    try {
      const list = await (await fetch('./shows/shows.json', { cache: 'no-cache' })).json();
      await c.addAll(list.map(s => './' + s.file.replace(/^\.?\//, '')));
    } catch (err) { /* 台本の取得に失敗しても本体は入れる */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
// キャッシュを即返し、ネットがあれば裏で最新に更新（会場で電波がなくても必ず開ける）
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
  })());
});
